import { redirect } from "next/navigation";

export default function PopularMarkets() {
  redirect("/markets#trending");
}
