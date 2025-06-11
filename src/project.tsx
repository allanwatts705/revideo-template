// Example usage in a Revideo scene
import {
  makeScene2D,
  Txt,
  Path,
  Layout,
  Rect,
  Img,
  Audio,
  Video,
  Circle,
} from "@revideo/2d";

import {
  createRef,
  waitFor,
  makeProject,
  all,
  ThreadGenerator,
  easeInOutCubic, // Import the easing function
} from "@revideo/core";

import {site} from "./instructions.json"
import "../src/global.css";

const scene = makeScene2D("scene", function* (view): ThreadGenerator {
  // --- Define two primary relative values for the browser window ---
  const BROWSER_WIDTH = 1540;
  const HEADER_HEIGHT = 100;

  // --- Derive other dimensions from the primary values to maintain proportions ---
  const URL_BAR_HEIGHT = HEADER_HEIGHT * 0.45; // Approx. 40px, based on original ratio
  const CONTROL_BUTTON_SIZE = HEADER_HEIGHT * 0.31; // Approx. 28px
  const WINDOW_DOT_SIZE = HEADER_HEIGHT * 0.22; // Approx. 20px
  const URL_BAR_WIDTH = BROWSER_WIDTH * 0.52; // Approx. 800px

  // The content area was originally scaled. We maintain this behavior.
  // Its visual width will match BROWSER_WIDTH.
  const INITIAL_SCALE = 0.8;
  const CONTENT_BASE_WIDTH = BROWSER_WIDTH / INITIAL_SCALE;
  // Preserve the original content aspect ratio (815 / 1920)
  const CONTENT_BASE_HEIGHT = CONTENT_BASE_WIDTH * (815 / 1920);

  const rect = createRef<Rect>();
  const video_ref = createRef<Video>();
  view.fill("white");
  view.add(
    <Img
      src={"/waves-macos-big-sur-colorful-5k-6016x6016-4992.jpg"}
      size={[1920, 1080]}
    />
  );
  view.add(
    <Rect scale={1.05} y={100} width={BROWSER_WIDTH} offset={[0, -1]} direction={"row"}>      <Rect
        y={-490}
        radius={[30, 30, 0, 0]}
        offset={[0, -1]}
        fill={"#2D2D2D"}
        width={BROWSER_WIDTH}
        zIndex={-1}
        height={HEADER_HEIGHT}
      >
        <Rect
          offset={[0, -1]}
          layout
          y={-40}
          x={50}
          height={HEADER_HEIGHT}
          width={BROWSER_WIDTH}
          alignContent={"center"}
          alignItems={"center"}
          direction={"row"}
          gap={10}
          padding={[20, 0]}
        >
          {/* Window controls */}
          <Circle
            width={WINDOW_DOT_SIZE}
            height={WINDOW_DOT_SIZE}
            fill="#FF5F57"
          />
          <Circle
            width={WINDOW_DOT_SIZE}
            height={WINDOW_DOT_SIZE}
            fill="#FEBC2E"
          />
          <Circle
            width={WINDOW_DOT_SIZE}
            height={WINDOW_DOT_SIZE}
            fill="#28C840"
          />

          {/* Navigation buttons with SVG paths */}
          <Rect
            width={CONTROL_BUTTON_SIZE}
            height={CONTROL_BUTTON_SIZE}
            radius={CONTROL_BUTTON_SIZE / 2}
            fill={"rgba(255,255,255,0.1)"}
            padding={6}
          >
            <Path data={"M15 6L9 12L15 18"} stroke={"#999"} />
          </Rect>
          <Rect
            width={CONTROL_BUTTON_SIZE}
            height={CONTROL_BUTTON_SIZE}
            radius={CONTROL_BUTTON_SIZE / 2}
            fill={"rgba(255,255,255,0.1)"}
            padding={6}
          >
            <Path layout data={"M9 6L15 12L9 18"} stroke={"white"} />
          </Rect>

          {/* URL bar */}
          <Rect
            // layout
            fill={"rgba(255,255,255,0.1)"}
            padding={8}
            alignContent={"center"}
            alignItems={"center"}
            radius={10}
            width={URL_BAR_WIDTH}
            height={URL_BAR_HEIGHT}
          >
            {/* Site icon */}
            <Rect width={16} height={16} x={-(URL_BAR_WIDTH / 2) + 20}>
              {/* <Path data={"M8 168 8 0 100 16 8 8 0 000 16z"}  /> */}
            </Rect>
            {/* URL text */}
            <Txt
              // offset={[-1, -1]}
              paddingLeft={200}
              text={site.replace("https://","")}
              fontSize={URL_BAR_HEIGHT * 0.4}
              textAlign={"center"}
              fill={"white"}
              fontFamily={"Fira Code"}
              fontWeight={200}
            />
          </Rect>

          {/* Browser actions */}
          <Rect
            width={CONTROL_BUTTON_SIZE}
            height={CONTROL_BUTTON_SIZE}
            radius={CONTROL_BUTTON_SIZE / 2}
            fill={"rgba(255,255,255,0.1)"}
            padding={6}
          >
            <Path data={"M12 6v12M6 12h12"} />
          </Rect>
          <Rect
            width={CONTROL_BUTTON_SIZE}
            height={CONTROL_BUTTON_SIZE}
            radius={CONTROL_BUTTON_SIZE / 2}
            fill="rgba(255,255,255,0.1)"
            padding={6}
          >
            <Path
              data={"M6 8h12M6 12h12M6 16h12"}
              //   stroke="#999"
              //   strokeWidth={2}
              //   strokeLinecap="round"
            />
          </Rect>
        </Rect>
      </Rect>
      <Rect
        ref={rect}
        // Start the window slightly lower to animate it moving up
        y={-400}
        offset={[0, -1]}
        size={[CONTENT_BASE_WIDTH, CONTENT_BASE_HEIGHT]}
        scale={INITIAL_SCALE}
        radius={[0, 0, 30, 30]} // [topLeft, topRight, bottomRight, bottomLeft]
        fill={"black"}
        shadowBlur={100}
        shadowColor={"rgb(26, 26, 25)"}
        clip
      >
        <Video
          ref={video_ref}
           src={"final_paced_scroll_video_darkmode.mp4"}
          // loop
          // y={-60} // Start the video slightly lower to animate it moving up
          // offset={[0, -1]}
          // size={[1600, 900]}
          // src={"http://localhost:9000/raw-screen-1749555093103.mp4"}

          // size={[1920 / 1.5, 1080 / 1.5]}
        />
      </Rect>
    </Rect>
  );

  // A brief pause at the beginning
  yield* waitFor(0.3);

  // Animate the zoom-in and upward movement together over 1.5 seconds
  //   yield* all(
  //     rect().scale(1.2, 1.5, easeInOutCubic)
  //     // rect().position.y(0, 1.5, easeInOutCubic)
  //   );
  yield video_ref().play();
  const duration = video_ref().getDuration();
  // Hold the zoomed-in position for the rest of the video's action
  yield* waitFor(duration);
});

export default makeProject({
  scenes: [scene],
  settings: {
    shared: {
      size: { x: 1920, y: 1080 },
    },
  },
});
