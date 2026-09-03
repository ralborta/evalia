#!/usr/bin/env python3
"""Validación funcional Fase 2 (CV ranking) en staging EasyPanel."""
from __future__ import annotations

import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = os.environ.get("EVALIA_STAGING_URL", "https://evalia-evalia-web.wd75db.easypanel.host")
EMAIL = os.environ.get("EVALIA_STAGING_EMAIL", "staging.evaluator@evalia.test")
PASSWORD = os.environ.get("EVALIA_STAGING_PASSWORD")
ACME_EMAIL = os.environ.get("EVALIA_STAGING_ACME_EMAIL", "staging.acme@evalia.test")
VIEWER_EMAIL = os.environ.get("EVALIA_STAGING_VIEWER_EMAIL", "staging.viewer@evalia.test")
JOB_ID = os.environ.get("EVALIA_JOB_ID", "cmtkt4fqk000s11z4t1yce38k")
APP_PDF = os.environ.get("EVALIA_APP_PDF", "cmtkte42l004i11z4lg0m81el")
APP_DOCX = os.environ.get("EVALIA_APP_DOCX", "cmtktf1qa006a11z4f0kny4sd")
APP_SCAN = os.environ.get("EVALIA_APP_SCAN", "cmtkt9k0c001p11z482i0mer7")
FIXTURES = Path(__file__).resolve().parents[1] / "docs" / "qa-phase2" / "fixtures"
OUT = Path(__file__).resolve().parents[1] / "docs" / "qa-phase2"
OUT.mkdir(parents=True, exist_ok=True)

results: list[dict] = []


def record(test_id: str, ok: bool, detail: str) -> None:
    results.append({"id": test_id, "ok": ok, "detail": detail})
    print(f"{'PASS' if ok else 'FAIL'}  {test_id}  {detail}")


def login(page, email: str) -> None:
    page.goto(f"{BASE}/login", wait_until="networkidle")
    page.locator("#email").fill(email)
    page.locator("#password").fill(PASSWORD)
    page.get_by_role("button", name="Iniciar sesión").click()
    page.wait_for_function("() => !location.pathname.startsWith('/login')", timeout=20000)


def api(page, method: str, url: str, **kwargs):
    return page.evaluate(
        """async ({ method, url, kwargs }) => {
          const init = { method, credentials: 'include' };
          if (kwargs.headers) init.headers = kwargs.headers;
          if (kwargs.json !== undefined) {
            init.headers = { ...(init.headers || {}), 'content-type': 'application/json' };
            init.body = JSON.stringify(kwargs.json);
          }
          if (kwargs.formPath && kwargs.formName) {
            const buf = await fetch(kwargs.formPath).then(r => r.arrayBuffer());
            const blob = new Blob([buf], { type: kwargs.formType || 'application/octet-stream' });
            const fd = new FormData();
            fd.append('file', blob, kwargs.formName);
            init.body = fd;
          }
          const res = await fetch(url, init);
          const text = await res.text();
          let body = null;
          try { body = JSON.parse(text); } catch { body = text.slice(0, 500); }
          return { status: res.status, body };
        }""",
        {"method": method, "url": url, "kwargs": kwargs},
    )


def upload_via_page(page, application_id: str, path: Path, mime: str):
    """Upload using Playwright set_input_files through fetch FormData built in Node via route."""
    data = path.read_bytes()
    b64 = __import__("base64").b64encode(data).decode()
    return page.evaluate(
        """async ({ applicationId, b64, fileName, mime }) => {
          const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
          const blob = new Blob([bin], { type: mime });
          const fd = new FormData();
          fd.append('file', blob, fileName);
          const res = await fetch(`/api/applications/${applicationId}/documents`, {
            method: 'POST', credentials: 'include', body: fd,
          });
          const text = await res.text();
          let body = null;
          try { body = JSON.parse(text); } catch { body = text.slice(0, 500); }
          return { status: res.status, body };
        }""",
        {
            "applicationId": application_id,
            "b64": b64,
            "fileName": path.name,
            "mime": mime,
        },
    )


def wait_doc(page, application_id: str, doc_id: str, timeout_s: int = 180):
    deadline = time.time() + timeout_s
    last = None
    while time.time() < deadline:
        res = api(page, "GET", f"/api/applications/{application_id}/documents")
        docs = (res.get("body") or {}).get("documents") or []
        last = next((d for d in docs if d.get("id") == doc_id), None)
        if last and last.get("processingStatus") in {
            "COMPLETED",
            "FAILED",
            "NEEDS_OCR",
        }:
            return last
        time.sleep(3)
    return last


def main() -> int:
    if not PASSWORD:
        print("Falta EVALIA_STAGING_PASSWORD", file=sys.stderr)
        return 1

    pdf = FIXTURES / "cv-texto.pdf"
    docx = FIXTURES / "cv-texto.docx"
    scanned = FIXTURES / "cv-escaneado.pdf"
    bad = FIXTURES / "malware.exe"

    with sync_playwright() as p:
        chrome = os.path.expanduser(
            "~/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-x64/chrome-headless-shell"
        )
        browser = p.chromium.launch(headless=True, executable_path=chrome)
        context = browser.new_context(ignore_https_errors=True)
        page = context.new_page()
        login(page, EMAIL)

        # 1) PDF texto
        up = upload_via_page(page, APP_PDF, pdf, "application/pdf")
        ok = up["status"] in (200, 201) and up["body"].get("document", {}).get("id")
        record("pdf-upload", bool(ok), f"status={up['status']} body_keys={list((up.get('body') or {}).keys())}")
        pdf_doc_id = (up.get("body") or {}).get("document", {}).get("id")
        pdf_final = wait_doc(page, APP_PDF, pdf_doc_id) if pdf_doc_id else None
        record(
            "pdf-process",
            bool(pdf_final and pdf_final.get("processingStatus") == "COMPLETED"),
            f"status={pdf_final}",
        )

        analysis = api(page, "GET", f"/api/applications/{APP_PDF}/cv-analysis")
        ev = analysis.get("body") or {}
        record(
            "pdf-analysis",
            analysis["status"] == 200 and (ev.get("evaluation") or {}).get("overallScore") is not None,
            f"status={analysis['status']} score={(ev.get('evaluation') or {}).get('overallScore')} excl={(ev.get('evaluation') or {}).get('excludingOutcome')}",
        )

        # 2) DOCX
        up2 = upload_via_page(
            page,
            APP_DOCX,
            docx,
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )
        docx_id = (up2.get("body") or {}).get("document", {}).get("id")
        record("docx-upload", up2["status"] in (200, 201) and bool(docx_id), f"status={up2['status']}")
        docx_final = wait_doc(page, APP_DOCX, docx_id) if docx_id else None
        record(
            "docx-process",
            bool(docx_final and docx_final.get("processingStatus") == "COMPLETED"),
            f"status={docx_final}",
        )

        # 3) Escaneado
        up3 = upload_via_page(page, APP_SCAN, scanned, "application/pdf")
        scan_id = (up3.get("body") or {}).get("document", {}).get("id")
        record("scan-upload", up3["status"] in (200, 201) and bool(scan_id), f"status={up3['status']}")
        scan_final = wait_doc(page, APP_SCAN, scan_id, timeout_s=90) if scan_id else None
        record(
            "scan-needs-ocr",
            bool(scan_final and scan_final.get("processingStatus") == "NEEDS_OCR"),
            f"status={scan_final}",
        )

        # 4) Inválido
        bad_up = upload_via_page(page, APP_PDF, bad, "application/octet-stream")
        record("invalid-reject", bad_up["status"] == 400, f"status={bad_up['status']} body={bad_up.get('body')}")

        # 5) Duplicado (mismo PDF en otra candidatura de la misma org)
        dup = upload_via_page(page, APP_DOCX, pdf, "application/pdf")
        record(
            "duplicate-hash",
            dup["status"] == 409 or (dup["status"] == 200 and (dup.get("body") or {}).get("document", {}).get("reused")),
            f"status={dup['status']} body={dup.get('body')}",
        )

        # 6) Ranking
        ranking = api(page, "GET", f"/api/jobs/{JOB_ID}/ranking")
        items = (ranking.get("body") or {}).get("ranking") or []
        has_expl = any(isinstance(i, dict) and i.get("explanationVsNeighbor") for i in items)
        record(
            "ranking",
            ranking["status"] == 200 and isinstance(items, list) and len(items) >= 1 and has_expl,
            f"status={ranking['status']} n={len(items) if isinstance(items, list) else 'n/a'} sample={str(items)[:400]}",
        )

        # 7) VIEWER no escribe
        context2 = browser.new_context(ignore_https_errors=True)
        page_v = context2.new_page()
        login(page_v, VIEWER_EMAIL)
        v_up = upload_via_page(page_v, APP_PDF, pdf, "application/pdf")
        record("viewer-no-write", v_up["status"] in (401, 403), f"status={v_up['status']}")
        context2.close()

        # 8) Aislamiento ACME
        context3 = browser.new_context(ignore_https_errors=True)
        page_a = context3.new_page()
        login(page_a, ACME_EMAIL)
        cross = api(page_a, "GET", f"/api/applications/{APP_PDF}/documents")
        if pdf_doc_id:
            cross_doc = api(page_a, "GET", f"/api/documents/{pdf_doc_id}")
        else:
            cross_doc = {"status": 0, "body": None}
        record(
            "org-isolation",
            cross["status"] in (403, 404) and cross_doc["status"] in (403, 404),
            f"list={cross['status']} doc={cross_doc['status']}",
        )
        context3.close()

        # UI smoke
        page.goto(f"{BASE}/applications/{APP_PDF}", wait_until="networkidle")
        has_cv = page.get_by_text("CV", exact=False).count() > 0
        record("ui-application-cv", has_cv, f"url={page.url}")
        page.goto(f"{BASE}/jobs/{JOB_ID}", wait_until="networkidle")
        has_rank = page.get_by_text("Ranking", exact=False).count() > 0
        record("ui-job-ranking", has_rank, f"url={page.url}")

        browser.close()

    evidence = {
        "base": BASE,
        "jobId": JOB_ID,
        "at": datetime.now(timezone.utc).isoformat(),
        "results": results,
        "passed": sum(1 for r in results if r["ok"]),
        "total": len(results),
    }
    (OUT / "evidence.json").write_text(json.dumps(evidence, ensure_ascii=False, indent=2))
    print(f"\n{evidence['passed']}/{evidence['total']} passed → {OUT / 'evidence.json'}")
    return 0 if evidence["passed"] == evidence["total"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
