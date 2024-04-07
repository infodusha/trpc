import { trpc } from './utils/trpc';

export function SendFileButton() {
  const mutation = trpc.file.useMutation();

  return (
    <label>
      Send File:
      <input
        type="file"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files.item(0);
            console.log('uploading file', file);

            mutation.mutate(file);
          }
        }}
      />
    </label>
  );
}
