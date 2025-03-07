import { Node, Rect, type NodeProps, Img, Txt, initial, signal, Audio } from "@revideo/2d"
import {
  createRef,
  createSignal,
  type PossibleVector2,
  waitFor,
  type SimpleSignal,
  type SignalValue,
  loop,
  type ColorSignal,
} from "@revideo/core"

export interface CardProps extends NodeProps {
  playerName?: SignalValue<string>
  playerImgSrc?: SignalValue<string>
  playerAudioSrc?: SignalValue<string>
  cardColor?: SignalValue<string>
  textColor?: SignalValue<string>
  strokeColor?: SignalValue<string>
}

export class Card extends Node {
  @initial("base")
  @signal()
  public declare readonly playerName: SimpleSignal<string, this>

  @initial("base")
  @signal()
  public declare readonly playerImgSrc: SimpleSignal<string, this>

  @initial("")
  @signal()
  public declare readonly playerAudioSrc: SimpleSignal<string, this>

  @initial("#ffffff")
  @signal()
  public declare readonly cardColor: ColorSignal<this>

  @initial("#000000")
  @signal()
  public declare readonly textColor: ColorSignal<this>

  @initial("#ffffff")
  @signal()
  public declare readonly strokeColor: ColorSignal<this>

  public container = createRef<Rect>()
  public sfxRef = createRef<Audio>()
  public ttsRef = createRef<Audio>()
  public scaleSignal = createSignal<PossibleVector2>(0)
  private readonly height = createSignal(550)
  private readonly aspectRatio = 0.71

  // Signals for floating animation
  private floatingY = createSignal(0)
  private floatingRotation = createSignal(0)

  public constructor(props?: CardProps) {
    super({
      ...props,
    })

    this.add(
      <Rect
        layout
        scale={() => this.scaleSignal()}
        alignItems={"center"}
        direction={"column"}

        justifyContent={"center"}
        ref={this.container}
        height={() => this.height()}
        width={() => this.height() * this.aspectRatio}
        fill={() => this.cardColor()}
        radius={40}
        offsetX={() => this.floatingY()}
        rotation={() => this.floatingRotation()}
        opacity={0} // Start with 0 opacity for reveal animation
      >
        <Rect radius={30} height={"80%"} width={"90%"} clip>
          <Img layout={false} radius={30} offsetY={-0.25} src={() => this.playerImgSrc()} />
        </Rect>
        <Audio ref={this.ttsRef} play={false} src={() => this.playerAudioSrc()} />
        <Audio ref={this.sfxRef} volume={0.3} play={false} src={"/pop.mp3"} />
        <Txt

          text={this.playerName()}
          fontSize={42}
          lineWidth={3}
          textAlign={"center"}
          fill={() => this.textColor()}
          stroke={() => this.strokeColor()}
          padding={20}
          fontFamily={"Luckiest Guy"}
        />
      </Rect>
    )
  }
  public *reveal() {
    yield* this.container().opacity(1, 0.5);
    yield this.sfxRef().play();
    yield this.ttsRef().play();
    yield* this.scaleSignal(1, 0.25, this.customEase);

  }

  public *answer() {
    yield this.sfxRef().src("/applause.mp3");
    yield* this.scaleSignal(0, 0);
    yield this.ttsRef().play();
    yield* this.scaleSignal(2, 0.5);
    yield* this.startFloating();
    yield* waitFor(3);
  }
  public *shrink() {
    yield* this.scaleSignal(0, 0);
  }

  public ttsDuration(){
    return this.sfxRef().getDuration()
  }


  private *startFloating() {
    // Floating animation parameters
    const floatDuration = 1; // Duration of one complete float cycle
    const floatHeight = 0.1; // Maximum float height in pixels
    const rotationAmount = 10; // Maximum rotation in degrees

    // Create floating animation
    // this.container().save();


    yield loop(() => {
      const time = (performance.now() / 1000) % floatDuration;
      const progress = time / floatDuration;

      // Smooth sine wave movement
      const yOffset = Math.sin(progress * Math.PI * 2) * floatHeight;
      const rotation = Math.sin(progress * Math.PI * 2) * rotationAmount;

      this.floatingY(yOffset);
      this.floatingRotation(rotation);

    });
  }

  // Stop floating animation if needed
  public stopFloating() {
    this.container().restore();
    this.floatingY(0);
    this.floatingRotation(0);
  }

  private customEase(t: number): number {
    // This is an approximation of your custom ease
    // You'll need to implement the bezier curve logic here
    const points = [
      [0, 0],
      [0.06536, 0.2849],
      [0.09, 0.37313],
      [0.11097, 0.4482],
      [0.15494, 0.58908],
      [0.18, 0.65439],
      [0.20293, 0.71415],
      [0.25264, 0.82601],
      [0.28, 0.87351],
      [0.3035, 0.91431],
      [0.35341, 0.98312],
      [0.38, 1.01],
      [0.40406, 1.33431],
      [0.45414, 1.56873],
      [0.48, 1.08004],
      [0.50577, 1.09132],
      [0.54887, 1.10074],
      [0.585, 1.0998],
      [0.67972, 1.09736],
      [1, 1],
    ];

    // Simple linear interpolation between points
    // For more accuracy, you'd want to implement proper bezier curve interpolation
    for (let i = 1; i < points.length; i++) {
      if (t <= points[i][0]) {
        const t0 = points[i - 1][0];
        const t1 = points[i][0];
        const v0 = points[i - 1][1];
        const v1 = points[i][1];
        return v0 + (v1 - v0) * ((t - t0) / (t1 - t0));
      }
    }
    return 1;
  }
}
