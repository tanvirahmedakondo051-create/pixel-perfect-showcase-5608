import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/oauth/github/return")({
  head: () => ({ meta: [{ title: "GitHub সংযোগ — Hexa AI" }, { name: "description", content: "GitHub সংযোগ সম্পন্ন হচ্ছে।" }, { property: "og:title", content: "GitHub সংযোগ — Hexa AI" }, { property: "og:description", content: "GitHub সংযোগ সম্পন্ন হচ্ছে।" }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Return,
});

function Return() {
  const [msg, setMsg] = useState("সংযোগ সম্পন্ন হচ্ছে…");
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const done = (type: "appUserConnectorOAuthComplete" | "appUserConnectorOAuthFailed", code?: string) => {
      window.opener?.postMessage({ type, connectorId: "github", code: code ?? null }, window.location.origin);
      window.close();
    };
    if (q.get("success") !== "true") { setMsg("সংযোগ সম্পন্ন হয়নি।"); return done("appUserConnectorOAuthFailed"); }
    const code = q.get("code");
    if (!code) {
      if (q.get("offline_access_allowed") === "false") return done("appUserConnectorOAuthComplete");
      setMsg("সংযোগ সম্পন্ন হয়নি।");
      return done("appUserConnectorOAuthFailed");
    }
    done("appUserConnectorOAuthComplete", code);
  }, []);
  return <div className="grid min-h-screen place-items-center p-6 text-center">{msg}</div>;
}
