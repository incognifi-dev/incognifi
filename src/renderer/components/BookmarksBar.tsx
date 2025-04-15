import { FiStar, FiX } from "react-icons/fi";
import type { WebviewTag } from "electron";

interface Bookmark {
  id: string;
  title: string;
  url: string;
  favicon?: string;
}

interface BookmarksBarProps {
  bookmarks: Bookmark[];
  webviewRef: React.RefObject<WebviewTag>;
  onRemoveBookmark: (id: string) => void;
  onBookmarkClick?: (url: string) => void;
}

export function BookmarksBar({ bookmarks, webviewRef, onRemoveBookmark, onBookmarkClick }: BookmarksBarProps) {
  const handleBookmarkClick = (url: string) => {
    if (onBookmarkClick) {
      onBookmarkClick(url);
    } else {
      webviewRef.current?.loadURL(url);
    }
  };

  return (
    <div className="px-4 py-1 bg-white border-b border-gray-200 flex items-center space-x-1 overflow-x-auto text-xs">
      {bookmarks.length === 0 ? (
        <span className="text-gray-400 italic">No bookmarks saved</span>
      ) : (
        bookmarks.map((bookmark) => (
          <div
            key={bookmark.id}
            className="flex items-center space-x-1 px-2 py-1 hover:bg-violet-50 rounded-sm cursor-pointer group min-w-fit transition-colors"
            onClick={() => handleBookmarkClick(bookmark.url)}
          >
            {bookmark.favicon ? (
              <img
                src={bookmark.favicon}
                alt=""
                className="w-3.5 h-3.5 object-contain"
              />
            ) : (
              <FiStar className="w-3.5 h-3.5 text-violet-400" />
            )}
            <span className="whitespace-nowrap max-w-[120px] overflow-hidden text-ellipsis text-gray-600">
              {bookmark.title}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemoveBookmark(bookmark.id);
              }}
              className="p-0.5 rounded-sm hover:bg-violet-100 opacity-0 group-hover:opacity-100 transition-all"
            >
              <FiX className="w-3 h-3 text-violet-500" />
            </button>
          </div>
        ))
      )}
    </div>
  );
}
