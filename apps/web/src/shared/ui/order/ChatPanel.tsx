import type { OrderMessage, OrderMessageChannel } from "@partiya/api-contracts";
import { Box, Button, cn, Input, Tag } from "@partiya/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Paperclip, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { getApiService, isApiError, MESSAGE_KEYS, orderMessagesOptions } from "@/shared/api";
import { formatDateTime } from "@/shared/lib/dates";

/* Макет: .msg / .msg.me — чат с технологом в правой колонке трекинга.
 *
 * Чат читает тот же журнал, что и лента: сообщение — это событие заказа (`messages.ts`),
 * поэтому новое сообщение приезжает каналом и попадает в оба места сразу.
 *
 * Непрочитанность двигается курсором `upToSeq`, а не списком id: экран, открытый на
 * сутки, иначе отправлял бы серверу сотню идентификаторов. */

export function ChatPanel({
  orderId,
  channel = "order",
  title = "Чат с технологом",
  disabled,
  disabledNote,
}: {
  orderId: number;
  channel?: OrderMessageChannel;
  title?: string;
  disabled?: boolean;
  disabledNote?: string;
}) {
  const queryClient = useQueryClient();
  const query = useQuery(orderMessagesOptions(orderId, channel));
  const [text, setText] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);
  const listRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [attachment, setAttachment] = useState<File | null>(null);

  const messages = query.data?.items ?? [];
  const unread = query.data?.unread ?? 0;
  const lastSeq = messages.at(-1)?.seq ?? 0;

  // автопрокрутка вниз: новое сообщение должно быть видно без жеста
  useEffect(() => {
    const node = listRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages.length]);

  // прочитано ровно то, что показано на экране
  const markRead = useMutation({
    mutationFn: (upToSeq: number) =>
      getApiService().markOrderMessagesRead(orderId, { upToSeq, channel }),
    onSuccess: (list) => {
      queryClient.setQueryData(MESSAGE_KEYS.list(orderId, channel), list);
    },
  });
  const markReadRef = useRef(markRead);
  markReadRef.current = markRead;

  useEffect(() => {
    if (unread > 0 && lastSeq > 0) markReadRef.current.mutate(lastSeq);
  }, [lastSeq, unread]);

  const send = useMutation({
    mutationFn: async () => {
      const api = getApiService();
      let attachmentIds: string[] | undefined;
      if (attachment) {
        const upload = await api.requestMessageAttachmentUpload(orderId, {
          fileName: attachment.name,
          contentType: attachment.type || "application/octet-stream",
          size: attachment.size,
        });
        attachmentIds = [upload.fileId];
      }
      return api.sendOrderMessage(
        orderId,
        { text: text.trim(), attachmentIds, channel },
        `msg:${String(orderId)}:${String(Date.now())}`,
      );
    },
    onSuccess: () => {
      setText("");
      setAttachment(null);
      setError(undefined);
      if (fileRef.current) fileRef.current.value = "";
      void queryClient.invalidateQueries({ queryKey: MESSAGE_KEYS.list(orderId, channel) });
    },
    onError: (cause) => {
      setError(isApiError(cause) ? cause.message : "Сообщение не ушло — попробуйте ещё раз");
    },
  });

  return (
    <Box>
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-heading text-base font-bold">{title}</h3>
        {unread > 0 && <Tag tone="new">{unread} новых</Tag>}
      </div>

      <div ref={listRef} className="mt-2.5 max-h-80 overflow-y-auto pr-0.5">
        {messages.length === 0 ? (
          <p className="text-muted text-[13px]">
            Сообщений пока нет. Напишите технологу — он отвечает в рабочее время.
          </p>
        ) : (
          messages.map((message) => <MessageRow key={message.id} message={message} />)
        )}
      </div>

      {disabled === true ? (
        <p className="text-muted mt-2 text-[12.5px]">
          {disabledNote ?? "Заказ закрыт для переписки."}
        </p>
      ) : (
        <form
          className="mt-2 flex flex-wrap items-center gap-1.5"
          onSubmit={(event) => {
            event.preventDefault();
            if (text.trim().length === 0 && !attachment) return;
            send.mutate();
          }}
        >
          <Input
            value={text}
            onChange={(event) => {
              setText(event.target.value);
            }}
            placeholder="Сообщение…"
            aria-label="Сообщение технологу"
            className="min-w-0 flex-1"
          />
          <input
            ref={fileRef}
            type="file"
            className="sr-only"
            aria-label="Приложить файл к сообщению"
            onChange={(event) => {
              setAttachment(event.target.files?.[0] ?? null);
            }}
          />
          <Button
            type="button"
            variant="ghost"
            aria-label="Приложить файл"
            onClick={() => fileRef.current?.click()}
          >
            <Paperclip aria-hidden="true" className="size-4" />
          </Button>
          <Button type="submit" variant="cta" disabled={send.isPending} aria-label="Отправить">
            <Send aria-hidden="true" className="size-4" />
          </Button>
          {attachment && (
            <span className="text-muted w-full text-[12px]">
              Файл: {attachment.name}
              <button
                type="button"
                className="text-action ml-1.5"
                onClick={() => {
                  setAttachment(null);
                  if (fileRef.current) fileRef.current.value = "";
                }}
              >
                убрать
              </button>
            </span>
          )}
          {error !== undefined && <span className="text-danger w-full text-[12px]">{error}</span>}
        </form>
      )}
    </Box>
  );
}

function MessageRow({ message }: { message: OrderMessage }) {
  return (
    <div
      className={cn(
        "rounded-[8px] px-2.5 py-2 text-[13px]",
        "mb-1.5",
        message.own ? "bg-action-soft" : "bg-subtle",
        message.author.kind === "operator" && "bg-discount-soft",
      )}
    >
      <div className="text-muted mb-0.5 text-[11px]">
        {message.author.name} · {formatDateTime(message.createdAt)}
      </div>
      {message.text}
      {message.attachments.length > 0 && (
        <ul className="mt-1 list-none p-0">
          {message.attachments.map((file) => (
            <li key={file.id}>
              <a className="text-action text-[12.5px]" href={file.url ?? "#"}>
                {file.fileName}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
