import { s3 } from 'blob-common/core/s3';
import { ses } from 'blob-common/core/ses';
import { simpleParser } from 'mailparser';

const Bucket = process.env.mailBucket || process.env.devMailBucket || 'blob-images-email';
const webmaster = process.env.webmaster || process.env.devWebmaster || 'wintvelt@me.com';

const handleRecord = async (record) => {
    const messageId = record.ses?.mail?.messageId;
    if (!messageId) return undefined;

    // get file from S3
    const data = await s3.get({
        Bucket,
        Key: messageId
    });
    const email = await simpleParser(data.Body);
    const subject = `FW: from clubalmanac - from ${email.from.text} - ${email.subject}`;

    // forward message
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