import { useState } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { fetchData } from '@/lib/Api';

interface User {
  id: number;
  name: string;
  email: string;
  role?: {
    name: string;
    code: string;
  };
}

interface UserMultiSelectProps {
  projectId: string;
  value: string[];
  onChange: (userIds: string[]) => void;
}

export function UserMultiSelect({ projectId, value, onChange }: UserMultiSelectProps) {
  const [open, setOpen] = useState(false);

  // Fetch project team members
  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ['project-users', projectId],
    queryFn: async () => {
      const response = await fetchData(`project/${projectId}/team-members/`);
      return response?.results || response || [];
    },
    enabled: !!projectId,
  });

  const handleSelect = (userId: string) => {
    const newValue = value.includes(userId)
      ? value.filter((id) => id !== userId)
      : [...value, userId];
    onChange(newValue);
  };

  const handleRemove = (userId: string) => {
    onChange(value.filter((id) => id !== userId));
  };

  const selectedUsers = users?.filter((u) => value.includes(String(u.id))) || [];

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            <span className="text-sm text-muted-foreground">
              {value.length > 0
                ? `${value.length} user${value.length > 1 ? 's' : ''} selected`
                : 'Select users...'}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder="Search users..." />
            <CommandEmpty>
              {isLoading ? 'Loading users...' : 'No users found.'}
            </CommandEmpty>
            <CommandGroup className="max-h-64 overflow-auto">
              {users?.map((user) => (
                <CommandItem
                  key={user.id}
                  value={`${user.name} ${user.email}`}
                  onSelect={() => handleSelect(String(user.id))}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value.includes(String(user.id)) ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-sm font-medium truncate">{user.name}</span>
                    <span className="text-xs text-muted-foreground truncate">
                      {user.email}
                      {user.role && ` · ${user.role.name}`}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected users badges */}
      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 border rounded-md bg-muted/20">
          {selectedUsers.map((user) => (
            <Badge
              key={user.id}
              variant="secondary"
              className="flex items-center gap-1 px-2 py-1"
            >
              <span className="text-xs">{user.name}</span>
              <button
                type="button"
                onClick={() => handleRemove(String(user.id))}
                className="ml-1 hover:bg-destructive/10 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
