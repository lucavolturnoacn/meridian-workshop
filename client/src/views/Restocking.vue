<template>
  <div class="restocking">
    <div class="page-header">
      <h2>{{ t('restocking.title') }}</h2>
      <p>{{ t('restocking.description') }}</p>
    </div>

    <div class="card budget-card">
      <div class="budget-input-row">
        <label class="budget-label" for="budget-input">
          {{ t('restocking.budgetCeiling') }}
        </label>
        <div class="budget-input-wrapper">
          <span class="currency-prefix">{{ currencySymbol }}</span>
          <input
            id="budget-input"
            v-model="budgetCeiling"
            type="number"
            min="0"
            step="100"
            class="budget-input"
            :placeholder="t('restocking.budgetPlaceholder')"
          />
        </div>
      </div>
    </div>

    <div v-if="loading" class="loading">{{ t('common.loading') }}</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else>
      <div class="stats-grid">
        <div class="stat-card danger">
          <div class="stat-label">{{ t('restocking.stats.itemsBelowReorder') }}</div>
          <div class="stat-value">{{ itemsBelowReorder }}</div>
        </div>
        <div class="stat-card warning">
          <div class="stat-label">{{ t('restocking.stats.totalRestockCost') }}</div>
          <div class="stat-value">{{ currencySymbol }}{{ totalRestockCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</div>
        </div>
        <div class="stat-card success">
          <div class="stat-label">{{ t('restocking.stats.affordableItems') }}</div>
          <div class="stat-value">{{ affordableItems }}</div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">{{ t('restocking.table.title') }} ({{ budgetedRecommendations.length }})</h3>
        </div>

        <div v-if="budgetedRecommendations.length === 0" class="empty-state">
          {{ t('restocking.noItems') }}
        </div>

        <div v-else class="table-container">
          <table class="restocking-table">
            <thead>
              <tr>
                <th class="col-sku">{{ t('restocking.table.sku') }}</th>
                <th class="col-name">{{ t('restocking.table.itemName') }}</th>
                <th class="col-category">{{ t('restocking.table.category') }}</th>
                <th class="col-num">{{ t('restocking.table.currentStock') }}</th>
                <th class="col-num">{{ t('restocking.table.reorderPoint') }}</th>
                <th class="col-num">{{ t('restocking.table.shortage') }}</th>
                <th class="col-trend">{{ t('restocking.table.demandTrend') }}</th>
                <th class="col-num">{{ t('restocking.table.suggestedQty') }}</th>
                <th class="col-cost">{{ t('restocking.table.unitCost') }}</th>
                <th class="col-cost">{{ t('restocking.table.estCost') }}</th>
                <th class="col-status">{{ t('restocking.table.budgetStatus') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in budgetedRecommendations"
                :key="item.sku"
                :class="{ 'row-over-budget': !item.withinBudget }"
              >
                <td class="col-sku"><strong>{{ item.sku }}</strong></td>
                <td class="col-name">{{ translateProductName(item.name) }}</td>
                <td class="col-category">{{ translateCategory(item.category) }}</td>
                <td class="col-num">{{ item.quantity_on_hand }}</td>
                <td class="col-num">{{ item.reorder_point }}</td>
                <td class="col-num"><strong>{{ item.shortage }}</strong></td>
                <td class="col-trend">
                  <span v-if="item.trend" :class="['badge', item.trend]">
                    {{ t(`trends.${item.trend}`) }}
                  </span>
                  <span v-else class="text-muted">—</span>
                </td>
                <td class="col-num"><strong>{{ item.suggested_qty }}</strong></td>
                <td class="col-cost">{{ currencySymbol }}{{ item.unit_cost.toFixed(2) }}</td>
                <td class="col-cost">
                  <strong>{{ currencySymbol }}{{ item.estimated_cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</strong>
                </td>
                <td class="col-status">
                  <span v-if="item.withinBudget" class="budget-ok">
                    ✓ {{ t('restocking.budgetStatus.withinBudget') }}
                  </span>
                  <span v-else class="budget-over">
                    {{ t('restocking.budgetStatus.overBudget') }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="budgetedRecommendations.length > 0" class="table-footer">
          <div class="footer-item">
            <span class="footer-label">{{ t('restocking.footer.itemsSelected', { count: selectedItemsCount }) }}</span>
          </div>
          <div class="footer-divider"></div>
          <div class="footer-item">
            <span class="footer-label">{{ t('restocking.footer.totalCost') }}:</span>
            <span class="footer-value">{{ currencySymbol }}{{ selectedTotalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
          </div>
          <div class="footer-divider"></div>
          <div class="footer-item">
            <span class="footer-label">{{ t('restocking.footer.remainingBudget') }}:</span>
            <span v-if="remainingBudget !== null" :class="['footer-value', remainingBudget < 0 ? 'value-negative' : 'value-positive']">
              {{ currencySymbol }}{{ remainingBudget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
            </span>
            <span v-else class="footer-value text-muted">{{ t('restocking.footer.noBudget') }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, watch, computed } from 'vue'
import { api } from '../api'
import { useFilters } from '../composables/useFilters'
import { useI18n } from '../composables/useI18n'

export default {
  name: 'Restocking',
  setup() {
    const { t, currentCurrency, translateProductName } = useI18n()

    const currencySymbol = computed(() => currentCurrency.value === 'JPY' ? '¥' : '$')

    const loading = ref(true)
    const error = ref(null)
    const inventoryItems = ref([])
    const demandForecasts = ref([])
    const budgetCeiling = ref('')

    const { selectedLocation, selectedCategory, getCurrentFilters } = useFilters()

    const loadData = async () => {
      try {
        loading.value = true
        error.value = null
        const filters = getCurrentFilters()
        const [inventoryData, demandData] = await Promise.all([
          api.getInventory({ warehouse: filters.warehouse, category: filters.category }),
          api.getDemandForecasts()
        ])
        inventoryItems.value = inventoryData
        demandForecasts.value = demandData
      } catch (err) {
        error.value = 'Failed to load restocking data: ' + err.message
      } finally {
        loading.value = false
      }
    }

    watch([selectedLocation, selectedCategory], () => {
      loadData()
    })

    onMounted(loadData)

    const demandMap = computed(() => {
      const map = {}
      for (const f of demandForecasts.value) map[f.item_sku] = f
      return map
    })

    const recommendations = computed(() => {
      const lowStock = inventoryItems.value.filter(
        item => item.quantity_on_hand <= item.reorder_point
      )

      const enriched = lowStock.map(item => {
        const demand = demandMap.value[item.sku] || null
        const trend = demand ? demand.trend : null
        const shortage = item.reorder_point - item.quantity_on_hand
        const suggested_qty = trend === 'increasing'
          ? Math.ceil(shortage * 1.25)
          : shortage
        const estimated_cost = suggested_qty * item.unit_cost

        return {
          sku: item.sku,
          name: item.name,
          category: item.category,
          quantity_on_hand: item.quantity_on_hand,
          reorder_point: item.reorder_point,
          unit_cost: item.unit_cost,
          shortage,
          trend,
          suggested_qty,
          estimated_cost
        }
      })

      enriched.sort((a, b) => {
        const aInc = a.trend === 'increasing' ? 0 : 1
        const bInc = b.trend === 'increasing' ? 0 : 1
        if (aInc !== bInc) return aInc - bInc
        return b.estimated_cost - a.estimated_cost
      })

      return enriched
    })

    const budgetNumber = computed(() => {
      const n = parseFloat(budgetCeiling.value)
      return isNaN(n) || n <= 0 ? null : n
    })

    const budgetedRecommendations = computed(() => {
      let cumulative = 0
      return recommendations.value.map(item => {
        if (budgetNumber.value === null) {
          cumulative += item.estimated_cost
          return { ...item, withinBudget: true }
        }
        const newCumulative = cumulative + item.estimated_cost
        if (newCumulative <= budgetNumber.value) {
          cumulative = newCumulative
          return { ...item, withinBudget: true }
        }
        return { ...item, withinBudget: false }
      })
    })

    const itemsBelowReorder = computed(() => recommendations.value.length)

    const totalRestockCost = computed(() =>
      recommendations.value.reduce((sum, item) => sum + item.estimated_cost, 0)
    )

    const affordableItems = computed(() =>
      budgetedRecommendations.value.filter(item => item.withinBudget).length
    )

    const selectedItemsCount = computed(() =>
      budgetedRecommendations.value.filter(i => i.withinBudget).length
    )

    const selectedTotalCost = computed(() =>
      budgetedRecommendations.value
        .filter(i => i.withinBudget)
        .reduce((sum, i) => sum + i.estimated_cost, 0)
    )

    const remainingBudget = computed(() => {
      if (budgetNumber.value === null) return null
      return budgetNumber.value - selectedTotalCost.value
    })

    const translateCategory = (category) => {
      const categoryMap = {
        'Circuit Boards': t('categories.circuitBoards'),
        'Sensors': t('categories.sensors'),
        'Actuators': t('categories.actuators'),
        'Controllers': t('categories.controllers'),
        'Power Supplies': t('categories.powerSupplies')
      }
      return categoryMap[category] || category
    }

    return {
      t,
      loading,
      error,
      budgetCeiling,
      currencySymbol,
      itemsBelowReorder,
      totalRestockCost,
      affordableItems,
      budgetedRecommendations,
      selectedItemsCount,
      selectedTotalCost,
      remainingBudget,
      translateProductName,
      translateCategory
    }
  }
}
</script>

<style scoped>
.budget-card {
  margin-bottom: 1.5rem;
}

.budget-input-row {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.budget-label {
  font-weight: 600;
  font-size: 0.938rem;
  color: #374151;
  white-space: nowrap;
}

.budget-input-wrapper {
  display: flex;
  align-items: center;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  overflow: hidden;
  background: #f8fafc;
  transition: all 0.2s;
  max-width: 260px;
}

.budget-input-wrapper:focus-within {
  border-color: #3b82f6;
  background: white;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.currency-prefix {
  padding: 0.5rem 0.75rem;
  background: #f1f5f9;
  border-right: 1px solid #cbd5e1;
  font-weight: 600;
  color: #475569;
  font-size: 0.938rem;
}

.budget-input {
  border: none;
  outline: none;
  padding: 0.5rem 0.75rem;
  font-size: 0.938rem;
  color: #0f172a;
  background: transparent;
  width: 180px;
}

.budget-input::placeholder {
  color: #94a3b8;
}

.restocking-table {
  width: 100%;
}

.col-sku      { width: 100px; }
.col-name     { min-width: 160px; }
.col-category { width: 120px; }
.col-num      { width: 90px; text-align: right; }
.col-trend    { width: 110px; }
.col-cost     { width: 100px; text-align: right; }
.col-status   { width: 130px; }

.row-over-budget td {
  color: #94a3b8;
  font-style: italic;
}

.row-over-budget strong {
  color: #94a3b8;
  font-style: normal;
}

.budget-ok {
  color: #059669;
  font-weight: 600;
  font-size: 0.813rem;
  white-space: nowrap;
}

.budget-over {
  color: #94a3b8;
  font-size: 0.813rem;
  white-space: nowrap;
}

.table-footer {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.875rem 1.25rem;
  border-top: 2px solid #e2e8f0;
  background: #f8fafc;
  border-radius: 0 0 10px 10px;
  flex-wrap: wrap;
}

.footer-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.footer-label {
  font-size: 0.875rem;
  color: #64748b;
  font-weight: 600;
}

.footer-value {
  font-size: 0.938rem;
  font-weight: 700;
  color: #0f172a;
}

.footer-divider {
  width: 1px;
  height: 20px;
  background: #cbd5e1;
}

.value-positive { color: #059669; }
.value-negative { color: #dc2626; }

.empty-state {
  padding: 2.5rem;
  text-align: center;
  color: #64748b;
  font-size: 0.938rem;
}

.text-muted {
  color: #94a3b8;
}
</style>
