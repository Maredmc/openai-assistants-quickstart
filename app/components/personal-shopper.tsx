'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import styles from './personal-shopper.module.css';

interface PersonalShopperProps {
  onSwitchToChat: (prefillQuestion?: string) => void;
  onBack: () => void;
}

type ChildAge = '0-1' | '1-3' | '3+' | '';
type NumberOfChildren = '1' | '2' | '2+' | '';
type RoomSize = 'small' | 'medium' | 'large' | '';
type Budget = 'economic' | 'medium' | 'premium' | '';

interface UserAnswers {
  childAge: ChildAge;
  numberOfChildren: NumberOfChildren;
  roomSize: RoomSize;
  budget: Budget;
  preferences: string[];
}

const PersonalShopper: React.FC<PersonalShopperProps> = ({ onSwitchToChat, onBack }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<UserAnswers>({
    childAge: '',
    numberOfChildren: '',
    roomSize: '',
    budget: '',
    preferences: []
  });

  const steps = [
    {
      id: 'age',
      title: 'Età del bambino',
      question: 'Quanti anni ha il tuo bambino?',
      icon: '👶',
      options: [
        { value: '0-1', label: '0-1 anno', description: 'Neonato/Lattante' },
        { value: '1-3', label: '1-3 anni', description: 'Prima infanzia' },
        { value: '3+', label: '3+ anni', description: 'Età prescolare e oltre' }
      ]
    },
    {
      id: 'children',
      title: 'Numero di bambini',
      question: 'Per quanti bambini stai cercando?',
      icon: '👨‍👩‍👧',
      options: [
        { value: '1', label: 'Un bambino', description: 'Soluzione singola' },
        { value: '2', label: 'Due bambini', description: 'Fratelli o gemelli' },
        { value: '2+', label: 'Due o più bambini', description: 'Famiglia numerosa' }
      ]
    },
    {
      id: 'room',
      title: 'Dimensioni cameretta',
      question: 'Quanto spazio hai a disposizione?',
      icon: '📏',
      options: [
        { value: 'small', label: 'Piccola', description: 'Meno di 10 m²' },
        { value: 'medium', label: 'Media', description: '10-15 m²' },
        { value: 'large', label: 'Grande', description: 'Oltre 15 m²' }
      ]
    },
    {
      id: 'budget',
      title: 'Budget orientativo',
      question: 'Qual è il tuo budget indicativo?',
      icon: '💰',
      options: [
        { value: 'economic', label: 'Economico', description: 'Fino a 500€' },
        { value: 'medium', label: 'Medio', description: '500€ - 1000€' },
        { value: 'premium', label: 'Premium', description: 'Oltre 1000€' }
      ]
    },
    {
      id: 'preferences',
      title: 'Preferenze',
      question: 'Cosa ti interessa di più? (scegli una o più opzioni)',
      icon: '⭐',
      multiple: true,
      options: [
        { value: 'montessori', label: 'Metodo Montessori', description: 'Autonomia e indipendenza' },
        { value: 'safety', label: 'Sicurezza', description: 'Sponde e protezioni' },
        { value: 'evolution', label: 'Evolutività', description: 'Cresce con il bambino' },
        { value: 'storage', label: 'Contenimento', description: 'Cassetti e spazio extra' },
        { value: 'design', label: 'Design', description: 'Estetica e stile' }
      ]
    }
  ];

  const handleAnswer = (stepId: string, value: string) => {
    const step = steps[currentStep];

    if (step.multiple) {
      // Gestione opzioni multiple (preferenze)
      setAnswers(prev => {
        const currentPrefs = prev.preferences || [];
        const newPrefs = currentPrefs.includes(value)
          ? currentPrefs.filter(p => p !== value)
          : [...currentPrefs, value];
        return { ...prev, preferences: newPrefs };
      });
    } else {
      // Risposta singola
      setAnswers(prev => ({ ...prev, [stepId]: value }));

      // Avanza automaticamente allo step successivo dopo 400ms
      setTimeout(() => {
        if (currentStep < steps.length - 1) {
          setCurrentStep(currentStep + 1);
        }
      }, 400);
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setCurrentStep(steps.length); // Vai al riepilogo
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const isStepComplete = () => {
    const step = steps[currentStep];
    if (!step) return false;

    if (step.multiple) {
      return answers.preferences.length > 0;
    }

    return answers[step.id as keyof UserAnswers] !== '';
  };

  const getRecommendations = () => {
    const recs: string[] = [];

    // Suggerimenti basati su età
    if (answers.childAge === '0-1') {
      recs.push('zero+ Earth - Perfetto per neonati con altezza regolabile');
      recs.push('zero+ Dream - Ideale come lettino dalla nascita');
    } else if (answers.childAge === '1-3') {
      recs.push('zero+ Fun - Letto basso Montessori per la prima infanzia');
      recs.push('zero+ Up - Evolutivo che cresce con il bambino');
    } else if (answers.childAge === '3+') {
      recs.push('zero+ Uppy - Letto singolo per bambini dai 3 anni in su');
      recs.push('zero+ Family - Soluzione versatile per età prescolare');
    }

    // Suggerimenti basati su numero bambini
    if (answers.numberOfChildren === '2' || answers.numberOfChildren === '2+') {
      recs.push('zero+ Duo - Letto a castello o doppio perfetto per fratelli');
    }

    // Accessori consigliati
    if (answers.preferences.includes('safety')) {
      recs.push('Sponde di sicurezza - Per notti tranquille');
    }
    if (answers.preferences.includes('storage')) {
      recs.push('Cassetti contenitori - Per ottimizzare lo spazio');
    }

    return recs.slice(0, 4); // Massimo 4 suggerimenti
  };

  const generateChatQuestion = () => {
    let question = 'Ciao! Sto cercando un letto evolutivo';

    if (answers.childAge) {
      const ageMap = {
        '0-1': 'per un bambino di 0-1 anno',
        '1-3': 'per un bambino di 1-3 anni',
        '3+': 'per un bambino dai 3 anni in su'
      };
      question += ` ${ageMap[answers.childAge]}`;
    }

    if (answers.numberOfChildren === '2' || answers.numberOfChildren === '2+') {
      question += ', per due bambini';
    }

    if (answers.roomSize) {
      const roomMap = {
        'small': 'in una cameretta piccola',
        'medium': 'in una cameretta di medie dimensioni',
        'large': 'in una cameretta spaziosa'
      };
      question += ` ${roomMap[answers.roomSize]}`;
    }

    if (answers.budget) {
      const budgetMap = {
        'economic': 'con un budget contenuto',
        'medium': 'con un budget medio',
        'premium': 'cercando una soluzione premium'
      };
      question += `, ${budgetMap[answers.budget]}`;
    }

    if (answers.preferences.length > 0) {
      question += `. Mi interessano particolarmente: ${answers.preferences.join(', ')}`;
    }

    question += '. Cosa mi consigli?';
    return question;
  };

  // Render dello step corrente
  if (currentStep < steps.length) {
    const step = steps[currentStep];
    const currentValue = step.multiple ? answers.preferences : answers[step.id as keyof UserAnswers];

    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <button className={styles.backButton} onClick={onBack}>
            ← Indietro
          </button>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
          <div className={styles.stepCounter}>
            Step {currentStep + 1} di {steps.length}
          </div>
        </div>

        <div className={styles.content}>
          <div className={styles.stepIcon}>{step.icon}</div>
          <h2 className={styles.stepTitle}>{step.title}</h2>
          <p className={styles.stepQuestion}>{step.question}</p>

          <div className={styles.optionsContainer}>
            {step.options.map((option) => {
              const isSelected = step.multiple
                ? (currentValue as string[])?.includes(option.value)
                : currentValue === option.value;

              return (
                <div
                  key={option.value}
                  className={`${styles.optionCard} ${isSelected ? styles.optionCardSelected : ''}`}
                  onClick={() => handleAnswer(step.id, option.value)}
                >
                  <div className={styles.optionHeader}>
                    <span className={styles.optionLabel}>{option.label}</span>
                    {isSelected && <span className={styles.checkmark}>✓</span>}
                  </div>
                  <span className={styles.optionDescription}>{option.description}</span>
                </div>
              );
            })}
          </div>

          <div className={styles.navigation}>
            {currentStep > 0 && (
              <button className={styles.navButton} onClick={handlePrevious}>
                ← Precedente
              </button>
            )}
            {step.multiple && (
              <button
                className={`${styles.navButton} ${styles.navButtonPrimary}`}
                onClick={handleNext}
                disabled={!isStepComplete()}
              >
                Avanti →
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Render del riepilogo finale
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={() => setCurrentStep(steps.length - 1)}>
          ← Modifica risposte
        </button>
      </div>

      <div className={styles.summaryContent}>
        <div className={styles.summaryIcon}>🎉</div>
        <h2 className={styles.summaryTitle}>Ecco i nostri suggerimenti!</h2>
        <p className={styles.summarySubtitle}>
          In base alle tue risposte, questi sono i prodotti più adatti alle tue esigenze:
        </p>

        <div className={styles.recommendationsContainer}>
          {getRecommendations().map((rec, index) => (
            <div key={index} className={styles.recommendationCard}>
              <span className={styles.recIcon}>✓</span>
              <span className={styles.recText}>{rec}</span>
            </div>
          ))}
        </div>

        <div className={styles.summaryActions}>
          <button
            className={styles.actionButton}
            onClick={() => onSwitchToChat(generateChatQuestion())}
          >
            💬 Continua con l'assistente
          </button>
          <button
            className={`${styles.actionButton} ${styles.actionButtonSecondary}`}
            onClick={onBack}
          >
            🔄 Ricomincia
          </button>
        </div>

        <p className={styles.summaryNote}>
          L'assistente AI potrà darti informazioni dettagliate, mostrarti i prodotti e rispondere a tutte le tue domande!
        </p>
      </div>
    </div>
  );
};

export default PersonalShopper;
