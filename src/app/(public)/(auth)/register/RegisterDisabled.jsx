import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function RegisterDisabled() {
  return (
    <Card className="mx-auto my-6 w-full max-w-[min(24rem,calc(100vw-1rem))] sm:my-8">
      <CardHeader>
        <CardTitle>Registration closed</CardTitle>
        <CardDescription>
          Public sign-up is disabled. Ask an administrator to create your account.
        </CardDescription>
      </CardHeader>
      <CardContent />
      <CardFooter>
        <Button asChild className="w-full" variant="secondary">
          <Link href="/login">Back to login</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
