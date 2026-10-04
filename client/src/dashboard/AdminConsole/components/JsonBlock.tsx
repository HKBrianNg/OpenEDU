export default function JsonBlock({ data }: { data: unknown }) {
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
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}