import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { getPublishedSite } from "@/lib/public.functions";

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
  return (
    <div className="fixed inset-0 bg-white">
      <iframe title={site.name} srcDoc={site.code_html} sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox" className="h-full w-full border-0" />
      {site.show_badge && (
        <a href="/" target="_blank" className="fixed bottom-3 right-3 rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow">
          Hexa AI দিয়ে তৈরি
        </a>
      )}
    </div>
  );
}
