"use client";

import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EditButtonProps {
  id: string;
  editPath?: string;
  entityName?: string;
  className?: string;
  size?: "default" | "sm" | "lg" | "icon";
  disabled?: boolean;
  onClick?: () => void;
}

export function EditButton({
  id,
  editPath,
  entityName = "item",
  className,
  size = "icon",
  disabled = false,
  onClick,
}: EditButtonProps) {
  const router = useRouter();

  return (
    <Button
      variant="ghost"
      size={size}
      className={cn("h-8 w-8", className)}
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        if (onClick) {
          onClick();
          return;
        }
        if (editPath) {
          router.push(`${editPath}/${id}`);
        }
      }}
    >
      <Pencil className="h-4 w-4" />
      <span className="sr-only">Edit {entityName}</span>
    </Button>
  );
}
