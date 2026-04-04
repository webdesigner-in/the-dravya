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
    <Card className="w-full max-w-sm mx-auto my-8">
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
