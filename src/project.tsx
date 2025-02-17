import {makeScene2D, Txt, Audio, Rect, Layout, Node,Gradient, View2D} from "@revideo/2d";

import {createRef, makeProject, waitFor,ThreadGeneratorFactory,Reference ,ThreadGenerator} from "@revideo/core";
import {Card} from "./Components/Card";
import questionsData from "./instructions.json";
import "./global.css";
import { AnimatedText } from "./Components/Title";

// types.ts
interface QuestionData {
  question: string;
  options: OptionData[];
  audioSrc: string;
  correctAnswerIndex: number;
}

interface OptionData {
  text: string;
  imageSrc: string;
  audioSrc: string;
}

const scene = makeScene2D('scene',function*(view:View2D):ThreadGenerator {
  // Function to create dynamic refs
  const createDynamicRefs = (count: number):Reference<Card>[] => {
    return Array(count)
      .fill(null)
      .map(() => createRef<Card>()) as Reference<Card>[]
  };



  const questionData:QuestionData = questionsData as QuestionData

      // Create refs
      const questionRef = createRef<Txt>();
      const bodyRef = createRef<Layout>();
      const sfxRef = createRef<Audio>();
      const animatedTextRef = createRef<AnimatedText>();
      const cardRefs = createDynamicRefs(questionData.options.length);
  
      // Create gradient background
      const gradient = new Gradient({
        fromX: -160,
        toX: 160,
        fromY: -160,
        toY: 160,
        type: "linear",
        angle: 135,
        stops: [
          {offset: 0, color: "#0033ff"},
          {offset: 1, color: "#6600ff"},
        ],
      });
  
      // Add background
      
      view.add(<Rect width={"100%"} height={"100%"} fill={gradient} zIndex={-1} />);
  
      // Add main layout
      view.add(
        <Layout
          padding={20}
          layout
          direction={"column"}
          height={"100%"}
          width={"100%"}
          alignContent={"end"}
          alignSelf={"start"}
          justifyContent={"center"}
        >
          <Audio ref={sfxRef} play={false} src={questionData.audioSrc} />
          
          {/* Question Section */}
          <Layout layout width={'100%'} height={"20%"} justifyContent={"center"} wrap={"wrap"}>
          <AnimatedText
        ref={animatedTextRef}
        text={questionData.question}
        fontSize={64}
        fill="#ffffff"
        stroke="black"
        fontFamily="Luckiest Guy"
        shadowColor="#000000"
        shadowBlur={4}
        shadowOffset={4}
      />
          </Layout>
  
          {/* Options Section */}
          <Layout
            layout
            ref={bodyRef}
            wrap={"wrap"}
            direction={"row"}
            alignContent={"center"}
            justifyContent={"center"}
            gap={40}
            columnGap={30}
            height={"0%"}
            width={"100%"}
          >
            {questionData.options.map((option, index) => (
              <Node>
                <Card
                  ref={cardRefs[index]}
                  playerImgSrc={option.imageSrc}
                  playerAudioSrc={option.audioSrc}
                  playerName={option.text}
                />
              </Node>
            ))}
          </Layout>
        </Layout>
      );
    // Animate the text
    yield sfxRef().play();
    yield* animatedTextRef().animate(0.1);
      // Animation sequence
      yield* waitFor(1);
      yield* bodyRef().height("60%", 1.5);
  
      // Reveal cards one by one
      for (let i = 0; i < cardRefs.length; i++) {
        yield* waitFor(0.3);
        yield* cardRefs[i]().reveal();
      }
  
      // Play ticking sound
    
      yield* waitFor(4);
     yield sfxRef().pause();
      yield sfxRef().src("/ding.mp3");
       yield sfxRef().play();
      yield* waitFor(1);
  
      // Remove incorrect answers and animate correct answer
      for (let i = 0; i < cardRefs.length; i++) {
        if (i !== questionData.correctAnswerIndex) {
          yield cardRefs[i]().remove();
        }
      }
    yield* cardRefs[questionData.correctAnswerIndex]().answer();
  

  yield* waitFor(2);
  // Render each question in sequence

});

export default makeProject({
  scenes: [scene],
  settings: {
    shared: {
      
      size: { x: 1080, y: 1920 },
    },
  },
});