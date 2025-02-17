import {renderVideo} from '@revideo/renderer';
import {fileName} from "./instructions.json";

interface Instructions {
  fileName: `${string}.mp4`;
}

async function render() {
  console.log('Rendering video...');
  

  // Cast the fileName to the template literal type
  const temp: Instructions = {
    fileName: fileName as `${string}.mp4`
  };

  console.log(temp)
  // This is the main function that renders the video
  const file = await renderVideo({
    projectFile: './src/project.tsx',
    settings: {
      logProgress: true,
      workers: 4,
      outFile: temp.fileName,
      puppeteer:{args:"--no-sandbox --disable-setuid-sandbox".split(" ")}
    },
    
  });

  console.log(`Rendered video to ${file}`);
}

render().catch(error => {
  console.error('Error rendering video:', error);
});