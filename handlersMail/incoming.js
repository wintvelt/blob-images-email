import { s3 } from 'blob-common/core/s3';
import { simpleParser } from 'mailparser';

const Bucket = process.env.mailBucket || process.env.devMailBucket || 'blob-images-email';

const handleRecord = async (record) => {
    const messageId = record.ses?.mail?.messageId;
    if (!messageId) return undefined;

    // get file from S3
    const data = await s3.get({
        Bucket,
        Key: messageId
    });
    console.log({data});
    const email = await simpleParser(data.Body);
    console.log({email});
    // forward message
    return undefined;
};

export const main = async (event, context, callback) => {
    const records = event.Records || [];
    const emailPromises = records.map(handleRecord);
    await Promise.all(emailPromises);
    callback(null, event);
};