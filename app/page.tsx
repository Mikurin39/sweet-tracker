import { redirect } from "next/navigation";

export default function Home() {
  // Authenticated users land on the dashboard; the middleware redirects
  // unauthenticated users to /login.
  redirect("/dashboard");
}
