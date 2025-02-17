// AnimatedText.tsx
import {
    Node,
    NodeProps,
    Txt,
    Layout,
    initial,
    signal,
  } from "@revideo/2d";
  import {
    createRef,
    createSignal,
    waitFor,
    SimpleSignal,
    SignalValue,
    Vector2,
  } from "@revideo/core";
  
  export interface AnimatedTextProps extends NodeProps {
    text?: SignalValue<string>;
    fontSize?: SignalValue<number>;
    fill?: SignalValue<string>;
    stroke?: SignalValue<string>;
    fontFamily?: SignalValue<string>;
    shadowColor?: SignalValue<string>;
    shadowBlur?: SignalValue<number>;
    shadowOffset?: SignalValue<number>;
  }
  
  export class AnimatedText extends Node {
    @initial("")
    @signal()
    public declare readonly text: SimpleSignal<string, this>;
  
    @initial(64)
    @signal()
    public declare readonly fontSize: SimpleSignal<number, this>;
  
    @initial("#ffffff")
    @signal()
    public declare readonly fill: SimpleSignal<string, this>;
  
    @initial("black")
    @signal()
    public declare readonly stroke: SimpleSignal<string, this>;
  
    @initial("Luckiest Guy")
    @signal()
    public declare readonly fontFamily: SimpleSignal<string, this>;
  
    @initial("#000000")
    @signal()
    public declare readonly shadowColor: SimpleSignal<string, this>;
  
    @initial(4)
    @signal()
    public declare readonly shadowBlur: SimpleSignal<number, this>;
  

  
    private wordRefs: ReturnType<typeof createRef<Txt>>[] = [];
    private container = createRef<Layout>();
  
    public constructor(props?: AnimatedTextProps) {
      super(props);
  
      const words = this.text().split(" ");
      this.wordRefs = words.map(() => createRef<Txt>());
  
      this.add(
        <Layout
          ref={this.container}
          layout
          direction="row"
          wrap="wrap"
          alignItems="center"
          justifyContent="center"
          gap={20}
          height={'60%'}
          width={"100%"} // Adjust based on your needs
        >
          {words.map((word, index) => (
            <Txt
              ref={this.wordRefs[index]}
              text={word}
              fontSize={() => this.fontSize()}
              fill={() => this.fill()}
              stroke={() => this.stroke()}
              fontFamily={() => this.fontFamily()}
              shadowColor={() => this.shadowColor()}
              shadowBlur={() => this.shadowBlur()}
              shadowOffset={() => this.shadowOffset()}
              opacity={0}
              height={'1%'}
              scale={0}
            />
          ))}
        </Layout>
      );
    }
  
    public *animate(staggerDelay = 0.1) {
      for (const wordRef of this.wordRefs) {
        yield* this.animateWord(wordRef);
        yield* waitFor(staggerDelay);
      }
    }
  
    private *animateWord(wordRef: ReturnType<typeof createRef<Txt>>) {
      yield* wordRef().opacity(1, 0.03);
      yield* wordRef().scale(1.2, 0.02);
      yield* wordRef().scale(1, 0.01);
    }
  
    public *fadeOut(staggerDelay = 0.1) {
      for (const wordRef of this.wordRefs) {
        yield* wordRef().opacity(0, 0.3);
        yield* waitFor(staggerDelay);
      }
    }
  
    public *emphasize(wordIndex: number) {
      if (wordIndex >= 0 && wordIndex < this.wordRefs.length) {
        const wordRef = this.wordRefs[wordIndex];
        yield* wordRef().scale(1.3, 0.2);
        yield* wordRef().scale(1, 0.1);
      }
    }
  }