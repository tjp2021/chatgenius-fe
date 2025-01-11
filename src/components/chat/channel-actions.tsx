'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/ui/icons';
import { CreateChannelDialog } from '@/components/chat/create-channel-dialog';
import { ChannelType } from '@/types/channel';

export function ChannelActions() {
  const [isCreatePublicOpen, setIsCreatePublicOpen] = useState(false);
  const [isCreatePrivateOpen, setIsCreatePrivateOpen] = useState(false);

  return (
    <div className="mt-auto flex flex-col gap-2 p-4">
      <CreateChannelDialog
        defaultType={ChannelType.PUBLIC}
        open={isCreatePublicOpen}
        onOpenChange={setIsCreatePublicOpen}
      >
        <Button
          variant="ghost"
          className="justify-start gap-2"
          onClick={() => setIsCreatePublicOpen(true)}
        >
          <Icons.plus className="h-4 w-4" />
          Create Public Channel
        </Button>
      </CreateChannelDialog>

      <CreateChannelDialog
        defaultType={ChannelType.PRIVATE}
        open={isCreatePrivateOpen}
        onOpenChange={setIsCreatePrivateOpen}
      >
        <Button
          variant="ghost"
          className="justify-start gap-2"
          onClick={() => setIsCreatePrivateOpen(true)}
        >
          <Icons.plus className="h-4 w-4" />
          Create Private Channel
        </Button>
      </CreateChannelDialog>
    </div>
  );
} 