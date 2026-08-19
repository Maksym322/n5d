import { redirect } from "next/navigation";

// The registry has no landing page of its own — /admin opens on the Buyers tab.
export default function AdminIndexPage() {
  redirect("/admin/buyers");
}
