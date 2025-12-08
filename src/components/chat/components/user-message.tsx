"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Edit3, Trash2 } from "lucide-react";

interface UserMessageProps {
  message: any;
  isEditing: boolean;
  editingText: string;
  onEditingTextChange: (text: string) => void;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
}

export const UserMessage = ({
  message,
  isEditing,
  editingText,
  onEditingTextChange,
  onEdit,
  onSave,
  onCancel,
  onDelete,
}: UserMessageProps) => {
  return (
    <div className="flex justify-end mb-4 sm:mb-6 px-3 sm:px-0">
      <div className="max-w-[85%] sm:max-w-[80%] bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 sm:px-4 py-3 sm:py-3 relative group shadow-sm">
        {/* User Message Actions */}
        <div className="absolute -left-8 sm:-left-10 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5 sm:gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="h-6 w-6 p-0 bg-white dark:bg-gray-900 rounded-full shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <Edit3 className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="h-6 w-6 p-0 bg-white dark:bg-gray-900 rounded-full shadow-sm border border-gray-200 dark:border-gray-700 text-red-500 hover:text-red-700"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>

        {isEditing ? (
          <div className="space-y-3">
            <Textarea
              value={editingText}
              onChange={(e) => onEditingTextChange(e.target.value)}
              className="min-h-[80px] border-gray-200 dark:border-gray-600 rounded-xl"
            />
            <div className="flex gap-2">
              <Button
                onClick={onSave}
                size="sm"
                disabled={!editingText.trim()}
                className="rounded-full"
              >
                Save
              </Button>
              <Button
                onClick={onCancel}
                variant="outline"
                size="sm"
                className="rounded-full"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-gray-900 dark:text-gray-100">
            {message.parts.find((p: any) => p.type === "text")?.text}
          </div>
        )}
      </div>
    </div>
  );
};
