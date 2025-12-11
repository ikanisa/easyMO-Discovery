
import React from 'react';
import { Message } from '../../types';
import { ICONS } from '../../constants';
import BusinessResultsMessage from '../Business/BusinessResultsMessage';
import PropertyResultsMessage from '../RealEstate/PropertyResultsMessage';
import LegalResultsMessage from '../Legal/LegalResultsMessage';

interface MessageBubbleProps {
  message: Message;
  onReply?: (text: string) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onReply }) => {
  const isMe = message.sender === 'user';
  const isSystem = message.sender === 'system';
  const isAI = message.sender === 'ai';

  if (isSystem) {
    return (
      <div className="flex justify-center my-4 animate-in fade-in zoom-in">
        <span className="text-xs text-slate-500 bg-slate-800/50 px-3 py-1 rounded-full border border-white/5 shadow-sm backdrop-blur-sm">
          {message.text}
        </span>
      </div>
    );
  }

  // Check Results Payload
  const hasBusinessPayload = !!message.businessPayload && message.businessPayload.matches.length > 0;
  const hasPropertyPayload = !!message.propertyPayload && message.propertyPayload.matches.length > 0;
  const hasLegalPayload = !!message.legalPayload && message.legalPayload.matches.length > 0;

  return (
    <div className={`flex w-full mb-6 gap-3 ${isMe ? 'justify-end' : 'justify-start'}`}>
      
      {/* AI / Peer Avatar */}
      {!isMe && (
        <div className={`
          w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-lg mt-1
          ${isAI ? 'bg-gradient-to-br from-blue-500 to-purple-600 border border-white/10' : 'bg-slate-700 border border-white/5'}
        `}>
          {isAI ? (
            <ICONS.Sparkles className="w-4 h-4 text-white" />
          ) : (
             <span className="text-xs font-bold text-slate-300">P</span>
          )}
        </div>
      )}

      {/* Content Container */}
      <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[80%]`}>
        
        {/* 1. Image Attachment */}
        {message.image && (
          <div className={`mb-2 w-full overflow-hidden rounded-2xl border border-white/10 shadow-lg ${isMe ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}>
            <img 
              src={message.image.previewUrl} 
              alt="attachment" 
              className="w-full h-auto object-cover max-h-64 bg-slate-800"
              loading="lazy"
            />
            {message.image.caption && (
              <div className={`px-3 py-2 text-xs ${isMe ? 'bg-primary text-white' : 'bg-slate-800 text-slate-300'}`}>
                {message.image.caption}
              </div>
            )}
          </div>
        )}

        {/* 2. Text Bubble */}
        {message.text && (
          <div
            className={`
              rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm relative w-full
              ${isMe 
                ? 'bg-primary text-white rounded-tr-sm shadow-blue-500/10' 
                : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-sm'
              }
            `}
          >
            <div className="whitespace-pre-wrap">{message.text}</div>
            
            {/* Grounding Sources */}
            {message.groundingLinks && message.groundingLinks.length > 0 && (
              <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                <p className="text-[10px] uppercase tracking-wider opacity-60 font-bold flex items-center gap-1">
                  <ICONS.Map className="w-3 h-3" /> Sources
                </p>
                {message.groundingLinks.slice(0, 3).map((link, idx) => (
                  <a 
                    key={idx}
                    href={link.uri} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block text-xs text-blue-300 underline truncate hover:text-blue-200"
                  >
                    {link.title}
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3. Structured Business Results Widget */}
        {hasBusinessPayload && (
          <div className="w-full mt-2">
             <BusinessResultsMessage 
               payload={message.businessPayload!} 
               onLoadMore={(page) => onReply?.(`Show page ${page} of results`)}
             />
          </div>
        )}

        {/* 4. Structured Property Results Widget */}
        {hasPropertyPayload && (
          <div className="w-full mt-2">
             <PropertyResultsMessage 
               payload={message.propertyPayload!} 
               onLoadMore={(page) => onReply?.(`Show page ${page} of results`)}
             />
          </div>
        )}

        {/* 5. Structured Legal Results Widget */}
        {hasLegalPayload && (
          <div className="w-full mt-2">
             <LegalResultsMessage 
               payload={message.legalPayload!} 
               onLoadMore={(page) => onReply?.(`Show page ${page} of results`)}
             />
          </div>
        )}
      </div>

      {/* User Avatar */}
      {isMe && (
        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center shrink-0 border border-white/10 shadow-lg mt-1">
           <ICONS.User className="w-4 h-4 text-slate-400" />
        </div>
      )}

    </div>
  );
};

export default MessageBubble;
