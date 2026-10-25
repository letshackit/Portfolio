import { content } from '../data/content';
import { useUi } from '../app/providers/uiContext';
import { copyText } from '../lib/clipboard';
import { Button } from '../ui/Button';

/** Contact-section twin of the palette's "Copy email" command (FR-112). Shares the clipboard result mapping. */
export function CopyEmailButton() {
  const { showToast } = useUi();
  const onClick = () => {
    void copyText(content.contact.email).then((result) => {
      showToast(result === 'copied' ? content.palette.emailCopied : `${content.palette.copyBlocked}: ${content.contact.email}`);
    });
  };
  return (
    <Button variant="secondary" icon="copy" onClick={onClick}>
      {content.palette.copyButton}
    </Button>
  );
}
