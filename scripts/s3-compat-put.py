#!/usr/bin/env python3
"""Upload/download a file to an S3-compatible endpoint (GCS interop, R2, etc.).

Credentials come from the environment. Never prints secret values.
"""
from __future__ import annotations

import argparse
import datetime
import hashlib
import hmac
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request


def _sign(key: bytes, msg: str) -> bytes:
    return hmac.new(key, msg.encode("utf-8"), hashlib.sha256).digest()


def _sig_v4(method: str, url: str, access: str, secret: str, region: str, payload: bytes) -> dict[str, str]:
    parsed = urllib.parse.urlparse(url)
    host = parsed.netloc
    canonical_uri = parsed.path or "/"
    canonical_query = parsed.query
    now = datetime.datetime.utcnow()
    amzdate = now.strftime("%Y%m%dT%H%M%SZ")
    datestamp = now.strftime("%Y%m%d")
    payload_hash = hashlib.sha256(payload).hexdigest()
    canonical_headers = f"host:{host}\nx-amz-content-sha256:{payload_hash}\nx-amz-date:{amzdate}\n"
    signed_headers = "host;x-amz-content-sha256;x-amz-date"
    canonical_request = "\n".join(
        [method, canonical_uri, canonical_query, canonical_headers, signed_headers, payload_hash]
    )
    algorithm = "AWS4-HMAC-SHA256"
    cred_scope = f"{datestamp}/{region}/s3/aws4_request"
    string_to_sign = "\n".join(
        [algorithm, amzdate, cred_scope, hashlib.sha256(canonical_request.encode()).hexdigest()]
    )
    signing_key = _sign(
        _sign(_sign(_sign(("AWS4" + secret).encode("utf-8"), datestamp), region), "s3"),
        "aws4_request",
    )
    signature = hmac.new(signing_key, string_to_sign.encode("utf-8"), hashlib.sha256).hexdigest()
    auth = f"{algorithm} Credential={access}/{cred_scope}, SignedHeaders={signed_headers}, Signature={signature}"
    return {
        "Authorization": auth,
        "x-amz-date": amzdate,
        "x-amz-content-sha256": payload_hash,
        "Host": host,
    }


def _creds() -> tuple[str, str, str, str, str]:
    hmac_file = os.environ.get("S3_HMAC_JSON", "")
    if hmac_file:
        data = json.load(open(hmac_file))
        access = data["metadata"]["accessId"]
        secret = data["secret"]
    else:
        access = os.environ["S3_ACCESS_KEY_ID"]
        secret = os.environ["S3_SECRET_ACCESS_KEY"]
    endpoint = os.environ.get("S3_ENDPOINT", "https://storage.googleapis.com").rstrip("/")
    bucket = os.environ["S3_BUCKET"]
    region = os.environ.get("S3_REGION", "us-east-1")
    return access, secret, endpoint, bucket, region


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=["put", "get", "head"])
    parser.add_argument("key")
    parser.add_argument("path")
    args = parser.parse_args()

    access, secret, endpoint, bucket, region = _creds()
    url = f"{endpoint}/{bucket}/{args.key.lstrip('/')}"
    if args.action == "put":
        payload = open(args.path, "rb").read()
        headers = _sig_v4("PUT", url, access, secret, region, payload)
        req = urllib.request.Request(url, data=payload, method="PUT", headers=headers)
    elif args.action == "get":
        headers = _sig_v4("GET", url, access, secret, region, b"")
        req = urllib.request.Request(url, method="GET", headers=headers)
    else:
        headers = _sig_v4("HEAD", url, access, secret, region, b"")
        req = urllib.request.Request(url, method="HEAD", headers=headers)

    try:
        with urllib.request.urlopen(req, timeout=60) as res:
            body = res.read()
            if args.action == "get":
                open(args.path, "wb").write(body)
            print(f"ok action={args.action} status={res.status} bytes={len(body)} key={args.key}")
            return 0
    except urllib.error.HTTPError as e:
        err = e.read().decode("utf-8", "replace")
        print(f"error action={args.action} status={e.code} body={err[:300]}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
