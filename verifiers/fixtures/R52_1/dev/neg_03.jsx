import React from "react";

export class MediaPlayer extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      playing: false,
      muted: false,
      volume: 0.8,
      position: 0,
      rate: 1,
      loop: false,
      fullscreen: false,
      captions: false,
    };
    this.videoRef = React.createRef();
  }

  componentDidMount() {
    const video = this.videoRef.current;
    video.addEventListener("timeupdate", this.handleTime);
    video.addEventListener("ended", this.handleEnded);
  }

  componentWillUnmount() {
    const video = this.videoRef.current;
    video.removeEventListener("timeupdate", this.handleTime);
    video.removeEventListener("ended", this.handleEnded);
  }

  handleTime = () => {
    this.setState({ position: this.videoRef.current.currentTime });
  };

  handleEnded = () => {
    if (!this.state.loop) {
      this.setState({ playing: false });
    }
  };

  togglePlay = () => {
    const video = this.videoRef.current;
    if (this.state.playing) {
      video.pause();
    } else {
      video.play();
    }
    this.setState({ playing: !this.state.playing });
  };

  toggleMute = () => {
    this.videoRef.current.muted = !this.state.muted;
    this.setState({ muted: !this.state.muted });
  };

  changeVolume = (event) => {
    const volume = Number(event.target.value);
    this.videoRef.current.volume = volume;
    this.setState({ volume });
  };

  seek = (event) => {
    const position = Number(event.target.value);
    this.videoRef.current.currentTime = position;
    this.setState({ position });
  };

  changeRate = (event) => {
    const rate = Number(event.target.value);
    this.videoRef.current.playbackRate = rate;
    this.setState({ rate });
  };

  toggleLoop = () => {
    this.videoRef.current.loop = !this.state.loop;
    this.setState({ loop: !this.state.loop });
  };

  toggleFullscreen = () => {
    if (this.state.fullscreen) {
      document.exitFullscreen();
    } else {
      this.videoRef.current.requestFullscreen();
    }
    this.setState({ fullscreen: !this.state.fullscreen });
  };

  toggleCaptions = () => {
    this.setState({ captions: !this.state.captions });
  };

  render() {
    const { src, duration } = this.props;
    const { playing, muted, volume, position, rate, loop, captions } = this.state;
    return (
      <div className="player">
        <video ref={this.videoRef} src={src} />
        {captions && <div className="captions">Captions on</div>}
        <div className="controls">
          <button onClick={this.togglePlay}>{playing ? "Pause" : "Play"}</button>
          <button onClick={this.toggleMute}>{muted ? "Unmute" : "Mute"}</button>
          <input type="range" min="0" max="1" step="0.05" value={volume} onChange={this.changeVolume} />
          <input type="range" min="0" max={duration} value={position} onChange={this.seek} />
          <select value={rate} onChange={this.changeRate}>
            <option value="0.5">0.5x</option>
            <option value="1">1x</option>
            <option value="1.5">1.5x</option>
            <option value="2">2x</option>
          </select>
          <button onClick={this.toggleLoop}>{loop ? "Loop on" : "Loop off"}</button>
          <button onClick={this.toggleCaptions}>CC</button>
          <button onClick={this.toggleFullscreen}>Fullscreen</button>
        </div>
      </div>
    );
  }
}
