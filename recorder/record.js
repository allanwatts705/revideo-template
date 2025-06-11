const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const os = require('os');
const crypto = require('crypto');
const util = require('util');
const instructions = require('../src/instructions.json'); 

/**
 * Records a browser page scrolling step-by-step into a video file using Page.screencast(),
 * simulates reading time between viewport scrolls, supports max duration and scroll speed,
 * applies dark mode preference, and converts to a specific format (30 FPS MP4 by default) using FFmpeg.
 *
 * @param {object} options - Configuration options.
 * @param {string} options.url - The URL to record.
 * @param {string} options.outputFile - The path to save the final output video file (e.g., 'output.mp4').
 * @param {number} [options.viewportWidth=1280] - The width of the browser viewport.
 * @param {number} [options.viewportHeight=800] - The height of the browser viewport.
 * @param {number} [options.fps=30] - Target FPS for the *final* output video. The screencast will try to match this rate.
 * @param {number} [options.readingTimePerView=5000] - Time in milliseconds to pause and 'read' after scrolling to a new viewport section.
 * @param {number} [options.scrollSpeed=300] - Scrolling speed in pixels per second during the scroll animation.
 * @param {number} [options.maxDuration] - Optional maximum total video duration in milliseconds. Recording stops after this duration, even if the page isn't fully scrolled.
 * @param {boolean} [options.darkMode=true] - Whether to emulate the 'prefers-color-scheme: dark' media feature.
 * @param {string} [options.ffmpegPath='ffmpeg'] - Path to the ffmpeg executable if not in PATH.
 * @param {string} [options.outputFormat='mp4'] - Desired output container format (e.g., 'mp4', 'webm').
 * @param {string} [options.videoCodec='libx264'] - Desired output video codec (e.g., 'libx264', 'libvpx-vp9').
 * @param {string} [options.pixelFormat='yuv420p'] - Desired output pixel format (e.g., 'yuv420p').
 * @param {number} [options.crf=23] - CRF (Constant Rate Factor) for H.264 encoding (quality vs size). Lower is better quality.
 * @param {string} [options.preset='medium'] - Encoding speed vs compression preset (ultrafast, medium, slow, etc.).
 */
async function recordPagePacedScrollAndConvert(options) {
    const {
        url,
        outputFile,
        viewportWidth = 1280,
        viewportHeight = 800,
        fps = 30, // Target FPS for final output and screencast pacing
        readingTimePerView = 5000, // milliseconds
        scrollSpeed = 300, // pixels per second
        maxDuration, // milliseconds
        darkMode = true, // Added dark mode option
        ffmpegPath = 'ffmpeg',
        outputFormat = 'mp4',
        videoCodec = 'libx264', // Default to H.264 for MP4
        pixelFormat = 'yuv420p', // Required by many H.264 profiles
        crf = 23, // Quality setting
        preset = 'medium' // Encoding speed
    } = options;

    const frameInterval = 1000 / fps; // milliseconds per target frame interval
    const maxFrames = maxDuration !== undefined ? Math.round(maxDuration / frameInterval) : Infinity; // Total target frames if max duration is set

    const tempDir = path.join(os.tmpdir(), `browser-record-${crypto.randomBytes(8).toString('hex')}`);
    const tempScreencastFile = path.join(tempDir, 'screencast_temp.webm'); // Screencast typically outputs WebM

    console.log(`Using temporary directory: ${tempDir}`);
    fs.mkdirSync(tempDir, { recursive: true });

    // Ensure temp directory and file are cleaned up on exit
    const cleanup = () => {
        if (fs.existsSync(tempScreencastFile)) {
            try {
                fs.unlinkSync(tempScreencastFile);
                 console.log(`Cleaned up temporary file: ${tempScreencastFile}`);
            } catch (e) {
                console.warn(`Error cleaning up temp file ${tempScreencastFile}: ${e.message}`);
            }
        }
        if (fs.existsSync(tempDir)) {
            try {
                fs.rmSync(tempDir, { recursive: true, force: true });
                 console.log(`Cleaned up temporary directory: ${tempDir}`);
            } catch (e) {
                console.warn(`Error cleaning up temp directory ${tempDir}: ${e.message}`);
            }
        }
    };
    // Use SIGINT and SIGTERM for cleaner shutdowns
    process.on('SIGINT', () => { cleanup(); process.exit(); });
    process.on('SIGTERM', () => { cleanup(); process.exit(); });


    let browser;
    let recorder; // Variable to hold the ScreenRecorder instance

    try {
        browser = await puppeteer.launch({
            headless: 'new', // Use 'new' for newer Puppeteer versions
            args: [
                `--window-size=${viewportWidth},${viewportHeight}`
            ]
            // executablePath: '/path/to/your/chrome/or/chromium' // Uncomment if needed
        });
        const page = await browser.newPage();

        await page.setViewport({ width: viewportWidth, height: viewportHeight });

        // --- Apply Dark Mode Preference ---
        if (darkMode) {
            console.log('Emulating prefers-color-scheme: dark');
            await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
        }

        console.log(`Navigating to ${url}`);
        // Use 'domcontentloaded' for faster initial page load, then wait a bit
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // Give page a moment to render fully after initial load
        await new Promise(resolve => setTimeout(resolve, 2000)); // Initial wait time

        const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
        const viewportHeightInternal = await page.evaluate(() => window.innerHeight); // Actual height might differ slightly

        const maxScroll = scrollHeight - viewportHeightInternal;

        // --- Start Screencast ---
        console.log(`Starting screencast to temporary file: ${tempScreencastFile}`);
        recorder = await page.screencast({
            path: tempScreencastFile,
            everyNthFrame: Math.max(1, Math.round(1000 / frameInterval / 60)) // Capture at least every Nth frame relative to 60fps to support target fps
        });
         console.log('Screencast started.');


        if (maxScroll <= 0) {
             console.warn("Page height is less than or equal to viewport height. No scrolling needed.");
             console.log(`Recording a static video (e.g., 3 seconds or maxDuration if less)...`);

             // Ensure at top for static view
             await page.evaluate(y => window.scrollTo(0, y), 0);

             // Determine static video duration
             const staticVideoDuration = maxDuration !== undefined ? Math.min(3000, maxDuration) : 3000; // Default 3s if no maxDuration
             const numStaticFrames = Math.max(1, Math.round(fps * (staticVideoDuration / 1000)));
             const staticCaptureDuration = numStaticFrames * frameInterval; // Duration for the loop to run

             // Wait for the required static duration, driving screencast capture
             console.log(`Waiting for ${staticCaptureDuration / 1000} seconds for static capture.`);
             const startTime = Date.now();
             for(let i = 0; i < numStaticFrames; i++) {
                  await page.evaluate(y => window.scrollTo(0, y), 0); // Ensure position remains static
                  const timeForNextAction = startTime + ((i + 1) * frameInterval);
                  const timeToWait = timeForNextAction - Date.now();
                  if (timeToWait > 0) {
                      await new Promise(resolve => setTimeout(resolve, timeToWait));
                  }
             }


        } else {
             console.log(`Page height: ${scrollHeight}, Viewport height: ${viewportHeightInternal}, Max Scroll: ${maxScroll}`);
             console.log(`Scrolling step by step with reading time and scroll speed...`);

             const numReadingFramesPerView = Math.max(1, Math.round(fps * (readingTimePerView / 1000)));

             let currentScrollY = 0;
             const allFrameData = []; // Array to store scroll positions for each planned frame

             // --- Pre-calculate all scroll positions for planned frames ---
             let currentTotalFrames = 0;
             while (currentScrollY <= maxScroll && (maxFrames === Infinity || currentTotalFrames < maxFrames)) {
                 // --- Reading Phase ---
                 const numReadingFramesThisStep = numReadingFramesPerView;
                 const framesToAddInReading = Math.min(numReadingFramesThisStep, maxFrames - currentTotalFrames);

                 if (framesToAddInReading > 0) {
                     // console.log(`Step: Reading at scrollY=${Math.round(currentScrollY)} (${framesToAddInReading} frames)`);
                     for (let i = 0; i < framesToAddInReading; i++) {
                          allFrameData.push({ scrollY: currentScrollY, type: 'reading' });
                     }
                     currentTotalFrames += framesToAddInReading;
                 }

                 if (currentTotalFrames >= maxFrames) { break; } // Check after adding reading frames


                 // --- Scrolling Phase ---
                 const startScrollY = currentScrollY;
                 const targetScrollY = Math.min(currentScrollY + viewportHeightInternal, maxScroll);
                 const distanceToScroll = targetScrollY - startScrollY;

                 if (distanceToScroll <= 0) {
                     // Reached the bottom after the last reading phase.
                     break;
                 }

                 const durationForThisScroll = (distanceToScroll / scrollSpeed) * 1000; // milliseconds
                 const numScrollFramesForThisTransition = Math.max(1, Math.round(durationForThisScroll / frameInterval));
                 const framesToAddInScrolling = Math.min(numScrollFramesForThisTransition, maxFrames - currentTotalFrames);


                 if (framesToAddInScrolling > 0) {
                     // console.log(`Step: Scrolling from ${Math.round(startScrollY)} to ${Math.round(targetScrollY)} (${framesToAddInScrolling} frames)`);
                      for (let i = 0; i < framesToAddInScrolling; i++) {
                           const scrollProgress = framesToAddInScrolling <= 1 ? 1 : i / (framesToAddInScrolling - 1);
                           const interpolatedScrollY = startScrollY + distanceToScroll * scrollProgress;
                           allFrameData.push({ scrollY: interpolatedScrollY, type: 'scrolling' });
                      }
                      currentTotalFrames += framesToAddInScrolling;
                 }


                 currentScrollY = targetScrollY; // Update for the next reading phase

                 if (currentTotalFrames >= maxFrames) { break; } // Check after adding scrolling frames


                 // Add one extra 'reading' frame at the exact targetScrollY just after the scroll animation finishes
                 if (currentScrollY <= maxScroll && (maxFrames === Infinity || currentTotalFrames < maxFrames)) {
                     allFrameData.push({ scrollY: currentScrollY, type: 'reading-start' });
                     currentTotalFrames++;
                 } else if (maxFrames !== Infinity && currentTotalFrames >= maxFrames) {
                     break;
                 }
             }

             console.log(`Generated sequence for ${allFrameData.length} planned frames.`);

             if (allFrameData.length === 0) {
                  console.warn("No frames generated based on options. Stopping recording process.");
                  // Stop screencast and close browser immediately
                  if (recorder) { await recorder.stop(); recorder = null; }
                  if (browser && browser.isConnected()) { await browser.close(); }
                  cleanup(); // Ensure temp files/dir are gone
                  return; // Exit the function
             }


             // --- Execute Scroll Sequence and Capture ---
             console.log(`Executing scroll sequence for screencast...`);
             console.log(`Planned duration based on sequence: ~${(allFrameData.length * frameInterval / 1000).toFixed(2)} seconds.`);

             const startTime = Date.now();

             for (let i = 0; i < allFrameData.length; i++) {
                 const frameInfo = allFrameData[i];
                 const targetScrollY = frameInfo.scrollY;

                 // Scroll the page - use page.evaluate for direct scroll position control
                 await page.evaluate(y => {
                     window.scrollTo(0, y);
                 }, targetScrollY);

                 // The screencast is running in the background, capturing frames
                 // as the browser state changes due to scrolling and waiting.
                 // We just need to pace the actions.

                 // Calculate when the next action should occur to maintain the overall pace (simulated FPS)
                 const timeForNextAction = startTime + ((i + 1) * frameInterval);
                 const timeToWait = timeForNextAction - Date.now();

                 if (timeToWait > 0) {
                     await new Promise(resolve => setTimeout(resolve, timeToWait));
                 }
                 // else: We are behind schedule, no need to wait.
             }
             console.log(`Finished executing scroll sequence.`);
        }


        // --- Stop Screencast ---
        console.log('Stopping screencast...');
        if (recorder) {
            await recorder.stop();
            recorder = null; // Clear recorder variable
            console.log('Screencast stopped.');
        } else {
            console.warn('Screencast recorder was not active?');
        }

        // --- Close Browser ---
        console.log('Closing browser...');
        if (browser && browser.isConnected()) {
             await browser.close();
             browser = null;
             console.log('Browser closed.');
        }


        // --- FFmpeg Conversion ---
        console.log('Starting FFmpeg conversion...');

        if (!fs.existsSync(tempScreencastFile)) {
             console.error(`Temporary screencast file not found: ${tempScreencastFile}`);
             throw new Error("Temporary screencast file not created.");
        }

        const ffmpegArgs = [
            // Input options
            '-i', tempScreencastFile, // Input file
            // Output options
            '-c:v', videoCodec, // Video codec (e.g., libx264)
            '-pix_fmt', pixelFormat, // Pixel format (e.g., yuv420p)
            '-r', fps, // Output frame rate
             '-crf', crf, // Quality setting
             '-preset', preset, // Encoding speed
            '-movflags', '+faststart', // Optimize for streaming
            '-y', // Overwrite output file without asking
            outputFile // Final output file name
        ];

        // Add video filters if needed (e.g., motion blur filter would go here)
        // const vfFilters = [];
        // // Example: Add a simple box blur filter during conversion
        // const blurAmount = 1; // Define blur amount here if needed, or add to options
        // if (blurAmount > 0) {
        //      vfFilters.push(`boxblur=${blurAmount}:${blurAmount}`);
        //      console.log(`Applying box blur filter with amount: ${blurAmount}`);
        // }
        // if (vfFilters.length > 0) {
        //      ffmpegArgs.splice(ffmpegArgs.indexOf('-c:v'), 0, '-vf', vfFilters.join(','));
        // }


        console.log(`FFmpeg command: "${ffmpegPath}" ${ffmpegArgs.join(' ')}`);

        let ffmpegOutput = ''; // Capture both stdout and stderr
        const ffmpegProcess = spawn(ffmpegPath, ffmpegArgs);

        ffmpegProcess.stdout.on('data', (data) => {
             ffmpegOutput += data.toString();
             // console.log(`FFmpeg stdout: ${data}`); // Uncomment for verbose output
        });

        ffmpegProcess.stderr.on('data', (data) => {
             ffmpegOutput += data.toString();
             // console.error(`FFmpeg stderr: ${data}`); // Uncomment for verbose output
        });

        ffmpegProcess.on('error', (err) => {
             console.error(`Failed to start FFmpeg process: ${err.message}`);
             if (err.code === 'ENOENT') {
                 console.error(`Ensure FFmpeg is installed and the command '${ffmpegPath}' is in your system's PATH.`);
                 console.error('You might need to specify the full path using the ffmpegPath option.');
             }
             // Error will be propagated by the promise below
        });

        await new Promise((resolve, reject) => {
            ffmpegProcess.on('close', (code) => {
                if (code === 0) {
                    console.log(`FFmpeg conversion finished successfully! Video saved to ${outputFile}`);
                    resolve();
                } else {
                    console.error(`FFmpeg process exited with code ${code}`);
                    console.error('FFmpeg output:\n', ffmpegOutput);
                    reject(new Error(`FFmpeg conversion failed with code ${code}`));
                }
            });
        });

    } catch (error) {
        console.error('An error occurred:', error);
        // Cleanup handled by SIGINT/SIGTERM listeners
        // Close browser/stop recorder if still active (handled in finally)
        throw error; // Re-throw the error
    } finally {
        // Ensure browser is closed and recorder stopped if not already
        if (recorder) {
             try { await recorder.stop(); console.log('Recorder stopped in finally.'); } catch(e) { console.error('Error stopping recorder in finally:', e); }
             recorder = null;
        }
        if (browser && browser.isConnected()) {
            try { await browser.close(); console.log('Browser closed in finally.'); } catch(e) { console.error('Error closing browser in finally:', e); }
            browser = null;
       }
        // Temp dir cleanup handled by SIGINT/SIGTERM listeners on process exit
        // If process exits cleanly after FFmpeg success, cleanup is handled there.
        // If process exits due to error, cleanup is handled by the signal listeners.
    }
}

// --- Example Usage ---
const recordOptions = {
    url: instructions.site, // Replace with your desired URL (make sure it's scrollable)
    outputFile: './public/final_paced_scroll_video_darkmode.mp4', // Final output MP4 file
    viewportWidth: 1920,
    viewportHeight: 850,
    fps: 30, // Target FPS for the final MP4 video
    readingTimePerView: 5000, // Pause for 5 seconds per 'view'
    scrollSpeed: 400, // Scroll at 400 pixels per second during animation
    maxDuration: 30000 * 2, // Optional: Stop after 60 seconds (60000 ms)
    darkMode: true, // Enable dark mode emulation
    ffmpegPath: 'ffmpeg' // Make sure ffmpeg is in PATH or provide full path
};

recordPagePacedScrollAndConvert(recordOptions)
    .then(() => console.log('Overall recording and conversion process complete.'))
    .catch((err) => console.error('Overall process failed:', err));