import {
    dividerCell, emailBody, row, textCell,
    footerRow, greeting, headerRow, paragraph, photoRow, signatureCell, makeEmailSrc
} from 'blob-common/core/email';

const dividerSrc = makeEmailSrc('public/img/invite_divider.png');
const baseUrl = (domain) => `https://${domain}`;

export const bouncedInviteText = ({ domain, toName, invEmail, invName, groupName, groupId }) => {
    const url = `${baseUrl(domain)}/personal/groups/${groupId}`;
    return `Hi ${toName}, je uitnodiging aan ${invName} om lid te worden van "${groupName}" kon niet worden bezorgd 
op het email adres ${invEmail}. Weet je zeker dat het adres klopt?
Je kunt via ${url} een nieuwe uitnodiging sturen`;
};

export const bouncedInviteBody = ({ domain, toName, invName, invEmail, groupName, groupId, photoUrl }) => {
    const url = `${baseUrl(domain)}/personal/groups/${groupId}`;

    return emailBody([
        headerRow(makeEmailSrc('public/img/logo_email_1.png'), baseUrl),
        (photoUrl)? photoRow(makeEmailSrc(photoUrl, 600, 200), url) : '',
        row([
            textCell(greeting(`Hi ${toName},`)),
            textCell(paragraph(`Je uitnodiging aan ${invName} om lid te worden van <strong><span style="font-size: 16px;">${groupName}</span></strong>`)),
            textCell(paragraph(`konden we niet afleveren op het adres "${invEmail}". Weet je zeker dat dit adres klopt?`)),
            textCell(paragraph(`Je kunt op <a href="${url}">de ${groupName} pagina</a> een nieuwe uitnodiging sturen`)),
            dividerCell(dividerSrc),
        ]),
        row([
            textCell(paragraph('Succes en tot gauw!')),
            signatureCell(makeEmailSrc('public/img/signature_wouter.png'))
        ]),
        footerRow
    ]);
};