import React from 'react';
import { useT } from '../../../i18n/useT';

/**
 * The NOTE under the forecast chart: which crops each engine actually covers,
 * and whether the dashed line came from the trained model or a plain trend.
 *
 * Both crop lists come from the ai-engine (`/model-info` → forecast_model), so
 * this stays in step with the Python side rather than restating it from memory.
 * Crop names are localised through `crops.*`.
 */
const cropList = (t, names) => (names || []).map((n) => t(`crops.${n}`)).join(', ');

/**
 * Three states, not two. "The model is not running" and "the model is running
 * but has nothing to say about this crop today" are different facts, and the
 * second is the common one: the model covers five crops, and it withholds a
 * prediction when today's rate sits outside the range it was trained on.
 */
const lineFor = (usingModel, modelRunning) => {
  if (usingModel) return 'price.forecast.note.modelOn';
  return modelRunning ? 'price.forecast.note.modelSkipped' : 'price.forecast.note.modelOff';
};

export const ForecastNote = ({ modelInfo, usingModel, cropType }) => {
  const { t } = useT();
  if (!modelInfo) return null;

  const modelCrops = modelInfo.commodities || [];
  const ruleCrops = modelInfo.ruleBasedCrops || [];
  const horizon = modelInfo.horizonPeriods || 7;

  return (
    /*
     * Deliberately NOT `.notice` — that class is a flex row built for
     * [icon][one line of text], and it lays several block children out as
     * columns. This is a stack of paragraphs, so it gets the inset-note
     * treatment instead: paper ground on the card's white, hairline rule.
     */
    <div className="mt-4 space-y-1.5 border-2 border-rule bg-paper px-3 py-2.5 text-sm leading-snug">
      <p className="eyebrow">{t('price.forecast.note.title')}</p>

      <p className="text-ink-soft">
        {t(lineFor(usingModel, Boolean(modelInfo.available)), {
          crop: cropType ? t(`crops.${cropType}`) : '',
        })}
      </p>

      {/* The headline above is the best-paying mandi; this chart is the state
          average across every reporting one. Both are honest, and side by side
          they look like a contradiction unless we say which is which. */}
      <p className="text-ink-soft">{t('price.forecast.note.scope')}</p>

      {modelCrops.length > 0 && (
        <p className="text-ink-soft">
          {t('price.forecast.note.model', { count: horizon, crops: cropList(t, modelCrops) })}{' '}
          {t('price.forecast.note.modelState')}
        </p>
      )}

      {ruleCrops.length > 0 && (
        <p className="text-ink-soft">
          {t('price.forecast.note.ruleBased', { crops: cropList(t, ruleCrops) })}{' '}
          {t('price.forecast.note.ruleBasedOther')}
        </p>
      )}
    </div>
  );
};

export default ForecastNote;
