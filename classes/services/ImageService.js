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
     * 
     * @param {google.cloud.vision.v1.IWebDetection} result 
     */
    static analyzeWebResult(result) {
        console.log(result);
        let keyword = 'Unknown';
        //Full matching > 1 = Very likely
        //Full matching == 1 = Likely
        //Partial matching > 1 = Possibly
        //Partial matching <= 1 = Not likely
        if(result.fullMatchingImages.length > 1)
            keyword = 'Very likely';
        else if(result.fullMatchingImages.length == 1)
            keyword = 'Likely';
        else if(result.partialMatchingImages.length > 1)
            keyword = 'Possibly';
        else if(result.partialMatchingImages.length <= 1)
            keyword = 'Not likely';
        
        const embed = {
            title: 'Image Analysis',
            description: `Falsification Status: **${keyword}**`,
        };

        embed.fields = [
            result.pagesWithMatchingImages
                .map(({pageTitle, url}) => ({
                    name: decode(parse(pageTitle).innerText),
                    value: `[View page](${url} "${url}")`,
                })),
            /*
            {
                name: 'Matching Pages',
                value: result.pagesWithMatchingImages
                    .map(({pageTitle, url}) => 
                        `[${parse(pageTitle)}](${url} "${url}")`
                    )
                    .join(', ') 
                    || 'None',
            },
            {
                name: 'Matching Pages',
                value: result.pagesWithMatchingImages
                    .map(({pageTitle, url}) => 
                        `[${parse(pageTitle)}](${url} "${url}")`
                    )
                    .join(', ') 
                    || 'None',
            },
            */
        ];

        console.log(embed);

        return embed;
    }
};
