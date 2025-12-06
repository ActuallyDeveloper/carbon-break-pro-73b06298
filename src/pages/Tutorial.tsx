import { useNavigate } from 'react-router-dom';
import { TutorialMode } from '@/components/TutorialMode';

const Tutorial = () => {
  const navigate = useNavigate();

  return (
    <TutorialMode
      onClose={() => navigate('/home')}
      onComplete={() => navigate('/home')}
    />
  );
};

export default Tutorial;
