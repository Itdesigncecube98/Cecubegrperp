function toAmount(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function getResourceAmount(resources) {
  if (!Array.isArray(resources)) return 0;
  return resources.reduce((total, resource) => {
    const components = Array.isArray(resource.components) ? resource.components : [];
    if (components.length) {
      const componentAmount = components.reduce((sum, component) => {
        const baseAmount = toAmount(component.quantity) * toAmount(component.rate);
        return sum + baseAmount * (1 + toAmount(component.gstPercent) / 100);
      }, 0);
      // Component quantities already represent the quantities being costed.
      // Multiplying by the parent resource quantity counts the same quantity twice
      // for grouped and individual library resources.
      return total + componentAmount;
    }
    const baseAmount = toAmount(resource.quantity) * toAmount(resource.rate);
    return total + baseAmount * (1 + toAmount(resource.gstPercent) / 100);
  }, 0);
}

export function calculateWbsTaskAmounts(task) {
  const materials = Array.isArray(task.materials) ? task.materials : [];
  const labours = Array.isArray(task.labours) ? task.labours : [];
  const materialVolume = toAmount(task.volOfWorkMaterial);
  const labourVolume = toAmount(task.volOfWorkLabour);
  const materialAmount = materials.length
    ? getResourceAmount(materials)
    : materialVolume * toAmount(task.materialRate);
  const labourAmount = labours.length
    ? getResourceAmount(labours)
    : labourVolume * toAmount(task.labourRate);
  const materialRate = materialVolume > 0 ? materialAmount / materialVolume : toAmount(task.materialRate) || materialAmount;
  const labourRate = labourVolume > 0 ? labourAmount / labourVolume : toAmount(task.labourRate) || labourAmount;

  return {
    materialRate,
    materialAmount,
    labourRate,
    labourAmount,
    totalAmount: materialAmount + labourAmount,
  };
}

export function sumWbsTaskBudgets(tasks) {
  return tasks.reduce((total, task) => total + calculateWbsTaskAmounts(task).totalAmount, 0);
}
