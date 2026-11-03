import { Redirect } from "expo-router";
import { useSession } from "@/lib/session";

/** The app's front door: Home when signed in, otherwise sign-in. */
export default function Index() {
  const { session } = useSession();
  return <Redirect href={session.status === "signed-in" ? "/home" : "/sign-in"} />;
}
