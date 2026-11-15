interface Props {
  data: unknown;
}

export default function JsonBlock({ data }: Props) {
  let formatted: string;
  try {
    formatted = data === undefined ? '—' : JSON.stringify(data, null, 2);
  } catch {
    formatted = '（无法序列化）';
  }

  return (
    <pre
      style={{
        fontSize: 12,
        background: '#f5f5f5',
        padding: 8,
        borderRadius: 4,
        maxHeight: 200,
        overflow: 'auto',
        maxWidth: '100%',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
        margin: 0,
      }}
    >
      {formatted}
    </pre>
  );
}