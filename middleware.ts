import { auth } from "@/auth";
import { NextResponse } from "next/server";

const evaluatorPrefixes = ["/dashboard", "/interviews", "/reports", "/evaluation-profiles"];
const agentPrefixes = ["/agent"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const role = req.auth?.user?.role;
  const logged = !!req.auth;

  const isEvalArea = evaluatorPrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const isAgentArea = agentPrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!logged && (isEvalArea || isAgentArea)) {
    const login = new URL("/login", req.nextUrl);
    login.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(login);
  }

  if (logged && isEvalArea && role !== "EVALUATOR" && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/agent", req.nextUrl));
  }

  if (logged && isAgentArea && role !== "AGENT" && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/interviews/:path*",
    "/reports/:path*",
    "/evaluation-profiles/:path*",
    "/agent/:path*",
  ],
};
