'use client';

import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClickOutside: () => void;
}

export function EmojiPicker({ onSelect, onClickOutside }: EmojiPickerProps) {
  return (
    <div className="absolute bottom-full mb-2 z-50">
      <div className="relative">
        <Picker
          data={data}
          onEmojiSelect={(emoji: any) => onSelect(emoji.native)}
          onClickOutside={onClickOutside}
          theme="light"
          set="native"
          previewPosition="none"
          skinTonePosition="none"
          searchPosition="none"
          navPosition="none"
          perLine={8}
          maxFrequentRows={0}
        />
      </div>
    </div>
  );
} 