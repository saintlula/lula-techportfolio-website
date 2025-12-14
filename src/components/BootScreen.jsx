import { useEffect, useState } from 'react';
import TextType from './TextType';
import './BootScreen.css';

const BootScreen = ({ onFinish }) => {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const totalTime = 3200;

    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(onFinish, 600);
    }, totalTime);

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className={`boot-screen ${fadeOut ? 'boot-screen--hidden' : ''}`}>
      <TextType
        text="Hello, world!"
        typingSpeed={80}
        showCursor={true}
        cursorCharacter="_"
      />
    </div>
  );
};

export default BootScreen;
