import visionClient from '@google-cloud/vision';
import { parse } from 'node-html-parser';
import { decode } from 'html-entities';
const vision = new visionClient.ImageAnnotatorClient();

export class ImageService {
    nums_unicode = ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

    static async searchWeb(uri) {
        const [{webDetection}] = await vision.webDetection(uri);
        return webDetection;
    }

    /**
     * Analyze an IWebDetection result and return an object to be passed into an EmbedBase
     * @param {google.cloud.vision.v1.IWebDetection} result 
     */
    static analyzeWebResult(result) {
        let keyword = 'Unknown';
        //Full matching > 1 = Very likely
        //Full matching == 1 = Likely
        //Partial matching > 1 = Possibly
        //Partial matching <= 1 = Not likely
        if(result.fullMatchingImages.length > 1)
            keyword = 'Highly likely';
        else if(result.fullMatchingImages.length == 1)
            keyword = 'Likely';
        else if(result.partialMatchingImages.length > 1)
            keyword = 'Possible';
        else if(result.partialMatchingImages.length <= 1)
            keyword = 'Unlikely';
        
        return {
            title: 'Image Analysis',
            description: `Falsification Status: **${keyword}**`,
            fields: [
                ...result.pagesWithMatchingImages
                    .map(({pageTitle, url}) => ({
                        name: `📰 Webpage Match`,
                        value: `[${decode(parse(pageTitle).innerText)}](${url} "${url.split('?').shift()}")`,
                    })),
                ...result.fullMatchingImages
                    .map(({url}) => ({
                        name: `📷 Strong Image Match`,
                        value: `[${new URL(url).pathname.split('/').pop()}](${url})`,
                    })),
                ...result.partialMatchingImages
                    .map(({url}) => ({
                        name: `❔ Partial Image Match`,
                        value: `[${new URL(url).pathname.split('/').pop()}](${url})`,
                    })),
            ].slice(0, 25),
        };
    }
};
