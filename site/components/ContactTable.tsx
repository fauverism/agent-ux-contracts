import { CONTACT_CHANNELS } from '@/lib/site';

/* Three honest channels, set as ruled rows. The question is the row header;
   the answer is one link. */
export function ContactTable() {
  return (
    <table className="contact-table">
      <tbody>
        {CONTACT_CHANNELS.map((channel) => (
          <tr key={channel.href}>
            <th scope="row">{channel.question}</th>
            <td>
              <a href={channel.href}>{channel.label}</a>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
