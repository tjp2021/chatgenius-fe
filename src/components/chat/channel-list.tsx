'use client';

type Channel = {
  id: string;
  name: string;
  type: 'PUBLIC' | 'PRIVATE' | 'DM';
};

export const ChannelList = () => {
  // This will be connected to real data later
  const channels: Channel[] = [
    { id: '1', name: 'general', type: 'PUBLIC' },
    { id: '2', name: 'random', type: 'PUBLIC' },
  ];

  return (
    <div className="space-y-2">
      {channels.map((channel) => (
        <div 
          key={channel.id}
          className="px-3 py-2 hover:bg-gray-700 rounded-md cursor-pointer"
        >
          # {channel.name}
        </div>
      ))}
    </div>
  );
}; 