type Props = {
  params: {
    channelId: string;
  };
};

export default function ChannelPage({ params }: Props) {
  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 p-4 overflow-y-auto">
        {/* Messages will go here */}
      </div>
      <div className="p-4 border-t">
        {/* Message input will go here */}
      </div>
    </div>
  );
} 