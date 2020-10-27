import { s3 } from 'blob-common/core/s3';
import { ses } from 'blob-common/core/ses';
import { btoa } from "blob-common/core/base64";
import { dynamoDb } from "blob-common/core/db";
import { simpleParser } from 'mailparser';
import { bouncedInviteBody, bouncedInviteText } from '../helpers/email';

const Bucket = process.env.mailBucket || process.env.devMailBucket || 'blob-images-email';
const webmaster = process.env.webmaster || process.env.devWebmaster || 'wintvelt@me.com';
const stage = process.env.stage || process.env.devStage || 'dev';
const photoTable = {
    'dev': 'blob-images-photos-dev',
    'prod': 'blob-images-photos'
};

const handleRecord = async (record) => {
    const messageId = record.ses?.mail?.messageId;
    if (!messageId) return undefined;

    // get file from S3
    const data = await s3.get({
        Bucket,
        Key: messageId
    });
    const email = await simpleParser(data.Body);
    const subject = `FW: from clubalmanac ${stage.toUpperCase()} - from ${email.from.text} - ${email.subject}`;

    // check if bounced email
    console.log(email.subject);
    const isBounced = (email.subject === 'Delivery Status Notification (Failure)');
    console.log(isBounced);
    const textLines = email.text.split('\n') || [];
    const inviteLine = textLines.find(line => line.slice(0, 7) === 'Bezoek ');
    console.log(inviteLine);

    if (isBounced && inviteLine) {
        console.log('trying to bounce');
        const link = inviteLine.slice(7, inviteLine.length - 18);
        const inviteId = link.split('/').slice(-1)[0];
        const domain = link.split('/')[2];
        const environment = (domain.includes('dev') || domain.includes('localhost')) ? 'dev' : 'prod';
        const TableName = photoTable[environment];
        console.log({ link, domain, TableName, inviteId });
        try {
            const Key = JSON.parse(btoa(inviteId));
            const result = await dynamoDb.get({ TableName, Key });
            const invite = result.Item;
            if (!invite) throw new Error('could not retrieve invite');
            // inform invitor
            const invitor = invite.invitation.from;
            const toName = invitor.name;
            const toEmail = invitor.email;
            const invitee = invite.user;
            const invName = invitee.name;
            const invEmail = invitee.email;
            const group = invite.group;
            const groupName = group.name;
            const groupId = group.SK;
            const photoUrl = group.photoUrl;
            const subject = `Uitnodiging aan ${invName} voor "${groupName}" konden we niet bezorgen aan ${invEmail}`;

            const emailPromise = ses.sendEmail({
                toEmail,
                fromEmail: 'clubalmanac <wouter@clubalmanac.com>',
                subject,
                data: bouncedInviteBody({ domain, toName, invEmail, invName, groupName, groupId, photoUrl }),
                textData: bouncedInviteText({ domain, toName, invEmail, invName, groupName, groupId })
            });

            // delete invite from Db
            const deletePromise = dynamoDb.delete({ TableName, Key });

            return Promise.all([emailPromise, deletePromise]);

        } catch (error) {
            // do nothing - will forward email to webmaster ;)
            console.log('failed to bounce because', error);
        }
    }
    // in other cases, or invite retrieve error, simply forward message to webmaster
    return ses.sendEmail({
        toEmail: webmaster,
        fromEmail: 'clubalmanac <wouter@clubalmanac.com>',
        subject,
        data: email.html,
        textData: email.text
    });
};

export const main = async (event, context, callback) => {
    const records = event.Records || [];
    const emailPromises = records.map(handleRecord);
    await Promise.all(emailPromises);
    callback(null, event);
};