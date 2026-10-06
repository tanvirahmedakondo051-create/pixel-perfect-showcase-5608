import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useState } from "react";
import { X } from "lucide-react";
import { getPublishedSite } from "@/lib/public.functions";
import { bn } from "@/lib/auth";

export const Route = createFileRoute("/s/$subdomain")({
  loader: async ({ params }) => {
    const site = await getPublishedSite({ data: { subdomain: params.subdomain } });
    if (!site) throw notFound();
    return site;
  },
  head: ({ loaderData }) =>
    loaderData
      ? {
          meta: [
            { title: loaderData.name },
            { name: "description", content: `${loaderData.name} — Hexa AI দিয়ে তৈরি` },
            { property: "og:title", content: loaderData.name },
            { property: "og:description", content: "Hexa AI দিয়ে তৈরি ওয়েবসাইট" },
          ],
        }
      : { meta: [{ title: "সাইট পাওয়া যায়নি" }, { name: "robots", content: "noindex" }] },
  notFoundComponent: () => (
    <div className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <h1 className="text-2xl font-bold">সাইটটি পাওয়া যায়নি</h1>
        <p className="mt-2 text-muted-foreground">এটি হয়তো প্রকাশ বন্ধ করা হয়েছে।</p>
        <Link to="/" className="mt-4 inline-block text-cyan">Hexa AI-তে যান</Link>
      </div>
    </div>
  ),
  errorComponent: () => <div className="grid min-h-screen place-items-center">সাইটটি লোড হয়নি</div>,
  component: PublishedSite,
});

function PublishedSite() {
  const site = Route.useLoaderData();
  const [hideBanner, setHideBanner] = useState(false);
  if (site.status.state === "offline") {
    return (
      <div className="grid min-h-screen place-items-center px-6 text-center">
        <div className="glass max-w-sm rounded-2xl p-8">
          <h1 className="text-2xl font-bold">ওয়েবসাইটটি বন্ধ আছে</h1>
          <p className="mt-2 text-muted-foreground">এই ওয়েবসাইটের প্যাকেজের মেয়াদ শেষ। আবার চালু করতে প্যাকেজ আপগ্রেড করুন।</p>
          <Link to="/pricing" className="mt-5 inline-flex min-h-12 items-center rounded-xl bg-brand px-5 font-semibold text-primary-foreground">প্যাকেজ আপগ্রেড করুন</Link>
        </div>
      </div>
    );
  }
  return (
    <div className="fixed inset-0 bg-white">
      <iframe title={site.name} srcDoc={site.code_html} sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox" className="h-full w-full border-0" />
      {site.status.state === "grace" && !hideBanner && (
        <div className="fixed inset-x-3 top-3 z-10 mx-auto flex max-w-xl items-start gap-3 rounded-xl bg-background p-4 text-sm text-foreground shadow-glow">
          <p className="flex-1">এই ওয়েবসাইটের প্যাকেজ শেষ। আপগ্রেড না করলে <b>{bn(site.status.daysLeft)} দিন</b> পর ওয়েবসাইটটি বন্ধ হয়ে যাবে।</p>
          <button onClick={() => setHideBanner(true)} aria-label="বন্ধ করুন" className="grid size-8 place-items-center rounded-lg"><X className="size-4" /></button>
        </div>
      )}
      {site.show_badge && (
        <a href="/" target="_blank" className="fixed bottom-3 right-3 rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow">
          Hexa AI দিয়ে তৈরি
        </a>
      )}
    </div>
  );
}
