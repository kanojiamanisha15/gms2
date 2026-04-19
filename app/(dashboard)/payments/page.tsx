import { redirect } from "next/navigation";

/** Old path; expenses live at `/expenses`. */
export default function PaymentsRedirectPage() {
  redirect("/expenses");
}
