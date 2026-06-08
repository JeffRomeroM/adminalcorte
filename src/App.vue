<template>
  <div class="admin-container">
    <div class="admin-header">
      <h1 class="page-title">Control de Usuarios</h1>
      <p class="page-subtitle">
        Monitorea el estado de las suscripciones y gestiona los accesos a la plataforma.
      </p>
    </div>

    <div class="metrics-grid">
      <div class="metric-card card-total">
        <div class="metric-icon">👥</div>
        <div class="metric-info">
          <span class="metric-value">{{ usuarios.length }}</span>
          <span class="metric-label">Registrados</span>
        </div>
      </div>
      <div class="metric-card card-active">
        <div class="metric-icon">🟢</div>
        <div class="metric-info">
          <span class="metric-value">{{ totalActivos }}</span>
          <span class="metric-label">Accesos Activos</span>
        </div>
      </div>
      <div class="metric-card card-warning">
        <div class="metric-icon">⚠️</div>
        <div class="metric-info">
          <span class="metric-value">{{ totalPorVencer }}</span>
          <span class="metric-label">Por Vencer (≤5d)</span>
        </div>
      </div>
      <div class="metric-card card-danger">
        <div class="metric-icon">🔴</div>
        <div class="metric-info">
          <span class="metric-value">{{ totalVencidos }}</span>
          <span class="metric-label">Accesos Vencidos</span>
        </div>
      </div>
    </div>

    <div class="search-container">
      <div class="search-wrapper">
        <span class="search-icon">🔍</span>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Buscar por taller, propietario o número de WhatsApp..."
          class="search-input"
        />
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Consultando base de datos...</p>
    </div>

    <div v-else class="table-responsive">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Nombre del Negocio</th>
            <th>Propietario</th>
            <th>WhatsApp / Contacto</th>
            <th>Direción</th>
            <th>Último Pago</th>
            <th>Estado de Cobertura</th>
            <th class="text-center">Acceso</th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="user in usuariosFiltrados"
            :key="user.id"
            :class="{ 'row-disabled': !user.activo }"
          >
            <td>
              <div class="business-cell">
                <span class="avatar-taller">⚙️</span>
                <strong class="business-name">
                  Taller {{ user.nombre_negocio || 'Sin nombre' }}
                </strong>
              </div>
            </td>

            <td>
              <span class="mobile-label">Propietario:</span>
              <span class="text-primary">{{ user.nombre_propietario || '-' }}</span>
            </td>

            <td>
              <span class="mobile-label">Contacto:</span>
              <div class="whatsapp-cell">
                <span class="whatsapp-text">{{ user.whatsapp || '-' }}</span>
                <a 
                  v-if="user.whatsapp"
                  :href="`https://wa.me/${limpiarNumero(user.whatsapp)}`" 
                  target="_blank" 
                  class="btn-contact-whatsapp"
                  title="Contactar por WhatsApp"
                >
                  💬 Enviar Mensaje
                </a>
              </div>
            </td>

            
            <td>
              <span class="mobile-label">Dirección:</span>
              <span class="text-primary">{{ user.direccion || '-' }}</span>
            </td>
            <td>
              <span class="mobile-label">Último Pago:</span>
              <button class="date-badge-trigger" @click="abrirModal(user)" title="Editar fecha de pago">
                <span>{{ formatearFecha(user.fecha_pago) }}</span>
                <span class="edit-icon">📝</span>
              </button>
            </td>

            <td>
              <span class="mobile-label">Estado de Cobertura:</span>
              <span :class="claseDiasRestantes(calcularDiasRestantes(user.fecha_pago))">
                {{ textoDiasRestantes(calcularDiasRestantes(user.fecha_pago)) }}
              </span>
            </td>

            <td class="text-center actions-cell">
              <span class="mobile-label">Acceso:</span>
              <label class="switch">
                <input
                  type="checkbox"
                  :checked="user.activo"
                  @change="abrirModal(user)"
                />
                <span class="slider round"></span>
              </label>
            </td>
          </tr>

          <tr v-if="usuariosFiltrados.length === 0">
            <td colspan="6" class="empty-row">
              No se encontraron registros coincidentes.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <Transition name="fade">
      <div v-if="showModal" class="modal-overlay" @click.self="cerrarModal">
        <div class="modal">
          <div class="modal-header">
            <h3>Ajustes de Cuenta</h3>
            <button class="close-modal-btn" @click="cerrarModal">×</button>
          </div>
          
          <p class="modal-description">
            Configuración de permisos y pagos para: <br>
            <strong>Taller {{ usuarioSeleccionado?.nombre_negocio }}</strong>
          </p>
          
          <div class="form-group bg-light-panel">
            <label class="form-label">Permiso de Ingreso</label>
            <div class="toggle-status">
              <span :class="nuevoEstado ? 'status-active' : 'status-inactive'">
                {{ nuevoEstado ? '🟢 Permitido / Activo' : '🔴 Bloqueado / Inactivo' }}
              </span>
              <button 
                class="btn-toggle" 
                @click="nuevoEstado = !nuevoEstado"
                :disabled="bloquearCambioEstado"
              >
                Cambiar Estado
              </button>
            </div>
          </div>

          <div v-if="bloquearActivacionPorFecha" class="alert-panel alert-danger">
            ⚠️ <strong>Acción Bloqueada:</strong> No puedes activar una cuenta cuya cobertura ya expiró. Actualiza la fecha de pago primero.
          </div>

          <div v-if="bloquearDesactivacionPorFecha" class="alert-panel alert-warning">
            🛡️ <strong>Acción Protegida:</strong> No puedes desactivar el acceso porque la cuenta tiene días vigentes pagados.
          </div>

          <div class="form-group">
            <label for="fecha_pago" class="form-label">Fecha del último pago recibido</label>
            <input 
              id="fecha_pago"
              v-model="nuevaFechaPago" 
              type="date" 
              class="form-input"
            />
            <small class="form-help">
              Al guardar se renovarán automáticamente 31 días de cobertura.
            </small>
          </div>

          <div class="modal-actions">
            <button class="btn-cancel" @click="cerrarModal" :disabled="isUpdating">
              Cancelar
            </button>
            <button 
              class="btn-confirm" 
              @click="confirmarCambio" 
              :disabled="isUpdating || !puedeGuardar"
            >
              {{ isUpdating ? 'Guardando...' : 'Aplicar Cambios' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY
)

const loading = ref(true)
const isUpdating = ref(false)
const searchQuery = ref('')
const usuarios = ref([])

const showModal = ref(false)
const usuarioSeleccionado = ref(null)
const nuevoEstado = ref(false)
const nuevaFechaPago = ref('')

// --- SANITIZACIÓN PARA URL DE WHATSAPP ---
const limpiarNumero = (numStr) => {
  if (!numStr) return ''
  // Deja solo números eliminando '+', espacios o guiones
  return numStr.replace(/\D/g, '')
}

// --- LÓGICA DE PLAZOS Y COBERTURA ---

const calcularDiasRestantes = (fechaPagoStr) => {
  if (!fechaPagoStr) return null
  
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  
  const [anio, mes, dia] = fechaPagoStr.split('-').map(Number)
  const fechaPago = new Date(anio, mes - 1, dia)
  fechaPago.setHours(0, 0, 0, 0)
  
  const fechaVencimiento = new Date(fechaPago)
  fechaVencimiento.setDate(fechaVencimiento.getDate() + 31)
  
  const diferenciaTiempo = fechaVencimiento - hoy
  return Math.ceil(diferenciaTiempo / (1000 * 60 * 60 * 24))
}

const textoDiasRestantes = (dias) => {
  if (dias === null) return 'Sin fecha'
  if (dias < 0) return `Vencido (${Math.abs(dias)}d)`
  if (dias === 0) return 'Vence hoy'
  return `${dias} días vigentes`
}

const claseDiasRestantes = (dias) => {
  if (dias === null) return 'badge badge-gray'
  if (dias < 0) return 'badge badge-danger'
  if (dias <= 5) return 'badge badge-warning'
  return 'badge badge-success'
}

const formatearFecha = (fechaStr) => {
  if (!fechaStr) return 'Registrar pago'
  const [anio, mes, dia] = fechaStr.split('-')
  return `${dia}/${mes}/${anio}`
}

// --- CÓMPUTOS PARA CONTADORES (METRICAS) ---

const totalActivos = computed(() => usuarios.value.filter(u => u.activo).length)

const totalPorVencer = computed(() => {
  return usuarios.value.filter(u => {
    const dias = calcularDiasRestantes(u.fecha_pago)
    return u.activo && dias !== null && dias >= 0 && dias <= 5
  }).length
})

const totalVencidos = computed(() => {
  return usuarios.value.filter(u => {
    const dias = calcularDiasRestantes(u.fecha_pago)
    return dias !== null && dias < 0
  }).length
})

// --- VALIDACIONES DE NEGOCIO EN EL MODAL ---

const bloquearActivacionPorFecha = computed(() => {
  if (!nuevaFechaPago.value) return true
  const dias = calcularDiasRestantes(nuevaFechaPago.value)
  return dias !== null && dias < 0
})

const bloquearDesactivacionPorFecha = computed(() => {
  if (!nuevaFechaPago.value) return false
  const dias = calcularDiasRestantes(nuevaFechaPago.value)
  return dias !== null && dias >= 0
})

const bloquearCambioEstado = computed(() => {
  if (nuevoEstado.value && bloquearActivacionPorFecha.value) return true
  if (!nuevoEstado.value && bloquearDesactivacionPorFecha.value) return true
  return false
})

const puedeGuardar = computed(() => {
  if (nuevoEstado.value && bloquearActivacionPorFecha.value) return false
  if (!nuevoEstado.value && bloquearDesactivacionPorFecha.value) return false
  return true
})

// --- MANEJADORES DE ESTADO ---

const abrirModal = (user) => {
  usuarioSeleccionado.value = user
  nuevoEstado.value = user.activo 
  nuevaFechaPago.value = user.fecha_pago || '' 
  
  const dias = calcularDiasRestantes(user.fecha_pago)
  if (user.activo && dias !== null && dias < 0) {
    nuevoEstado.value = false
  } else if (!user.activo && dias !== null && dias >= 0) {
    nuevoEstado.value = true
  }
  
  showModal.value = true
}

const cerrarModal = () => {
  showModal.value = false
  const temp = usuarios.value
  usuarios.value = []
  setTimeout(() => {
    usuarios.value = temp
    usuarioSeleccionado.value = null
    nuevaFechaPago.value = ''
  }, 0)
}

const confirmarCambio = async () => {
  if (!usuarioSeleccionado.value || !puedeGuardar.value) return

  try {
    isUpdating.value = true
    let cleanId = usuarioSeleccionado.value.id.trim()
    if (cleanId.startsWith('T')) cleanId = cleanId.substring(1)
    
    const fechaEnvio = nuevaFechaPago.value ? nuevaFechaPago.value : ''
    
    const { error } = await supabase.rpc('cambiar_estado_usuario', {
      usuario_id: cleanId,
      nuevo_estado: nuevoEstado.value,
      nueva_fecha: fechaEnvio
    })

    if (error) throw error

    usuarioSeleccionado.value.activo = nuevoEstado.value
    usuarioSeleccionado.value.fecha_pago = nuevaFechaPago.value || null
    
    showModal.value = false
    usuarioSeleccionado.value = null
  } catch (error) {
    console.error('Error crítico:', error)
    alert(`Error: ${error.message || 'Fallo de persistencia'}`)
  } finally {
    isUpdating.value = false
  }
}

const fetchUsuarios = async () => {
  try {
    loading.value = true
    await supabase.rpc('revisar_y_actualizar_vencidos')
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('nombre_negocio', { ascending: true })

    if (error) throw error
    usuarios.value = data || []
  } catch (error) {
    console.error('Error reading profiles:', error)
  } finally {
    loading.value = false
  }
}

const usuariosFiltrados = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return usuarios.value

  return usuarios.value.filter(user =>
    user.nombre_negocio?.toLowerCase().includes(query) ||
    user.nombre_propietario?.toLowerCase().includes(query) ||
    user.whatsapp?.includes(query)
  )
})

onMounted(() => {
  fetchUsuarios()
})
</script>

<style scoped>
/* Contenedor Principal */
.admin-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 24px;
  font-family: system-ui, -apple-system, sans-serif;
  background-color: #f8fafc;
  min-height: 100vh;
}

.admin-header {
  margin-bottom: 32px;
}

.page-title {
  font-size: 32px;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.5px;
  margin: 0;
}

.page-subtitle {
  color: #64748b;
  margin-top: 8px;
  font-size: 16px;
}

/* Panel de Métricas */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}

.metric-card {
  background: white;
  padding: 20px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  gap: 16px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}

.metric-icon {
  font-size: 28px;
  background: #f1f5f9;
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
}

.metric-info {
  display: flex;
  flex-direction: column;
}

.metric-value {
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  line-height: 1;
}

.card-total { border-left: 4px solid #64748b; }
.card-active { border-left: 4px solid #10b981; }
.card-warning { border-left: 4px solid #f59e0b; }
.card-danger { border-left: 4px solid #ef4444; }

.metric-label {
  font-size: 13px;
  color: #64748b;
  margin-top: 4px;
  font-weight: 500;
}

/* Buscador */
.search-container {
  margin-bottom: 24px;
}

.search-wrapper {
  position: relative;
  max-width: 480px;
}

.search-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  font-size: 16px;
}

.search-input {
  width: 100%;
  padding: 14px 16px 14px 48px;
  border: 1px solid #cbd5e1;
  border-radius: 14px;
  outline: none;
  font-size: 15px;
  background-color: white;
  transition: all 0.2s ease;
  box-sizing: border-box;
}

.search-input:focus {
  border-color: #003034;
  box-shadow: 0 0 0 4px rgba(0, 48, 52, 0.1);
}

/* Tabla de Datos */
.table-responsive {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);
}

.admin-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.admin-table th {
  background: #f8fafc;
  color: #475569;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 18px 24px;
  border-bottom: 1px solid #e2e8f0;
}

.admin-table td {
  padding: 18px 24px;
  border-bottom: 1px solid #f1f5f9;
  color: #334155;
  font-size: 15px;
  vertical-align: middle;
}

.admin-table tr:hover {
  background-color: #f8fafc;
}

.row-disabled {
  background-color: #fcfcfc;
}

.row-disabled td {
  color: #94a3b8;
}

/* Celdas específicas */
.business-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar-taller {
  background: #e0f2f1;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  font-size: 14px;
}

.business-name {
  color: #0f172a;
}

.text-primary {
  font-weight: 500;
}

/* Celda de Contacto */
.whatsapp-cell {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-start;
}

.whatsapp-text {
  font-family: monospace;
  font-size: 14px;
  color: #334155;
}

/* Botón de Contacto */
.btn-contact-whatsapp {
  display: inline-flex;
  align-items: center;
  background-color: #25d366;
  color: white !important;
  text-decoration: none;
  font-size: 12px;
  font-weight: 700;
  padding: 6px 12px;
  border-radius: 8px;
  transition: background-color 0.15s ease;
}

.btn-contact-whatsapp:hover {
  background-color: #128c7e;
}

/* Disparador de Fecha */
.date-badge-trigger {
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 14px;
  color: #334155;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  transition: all 0.15s ease;
}

.date-badge-trigger:hover {
  background: #e2e8f0;
  border-color: #cbd5e1;
}

/* Badges de Cobertura */
.badge {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
}
.badge-success { background: #d1fae5; color: #065f46; }
.badge-warning { background: #fef3c7; color: #92400e; }
.badge-danger { background: #fee2e2; color: #991b1b; }
.badge-gray { background: #f1f5f9; color: #475569; }

.text-center { text-align: center; }
.mobile-label { display: none; }

/* Switch de Acceso */
.switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; cursor: pointer; inset: 0; background: #cbd5e1; transition: .2s ease; }
.slider:before {
  position: absolute; content: ""; width: 18px; height: 18px; left: 3px; bottom: 3px;
  background: white; transition: .2s ease;
}
input:checked + .slider { background: #10b981; }
input:checked + .slider:before { transform: translateX(20px); }
.slider.round { border-radius: 24px; }
.slider.round:before { border-radius: 50%; }

/* Animación de Carga */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 80px 24px;
  color: #64748b;
}
.spinner {
  width: 40px; height: 40px;
  border: 4px solid #e2e8f0; border-top-color: #0f172a;
  border-radius: 50%; animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.empty-row { text-align: center !important; color: #94a3b8; padding: 48px !important; font-style: italic; }

/* Capa y Ventana Modal */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(15, 23, 42, 0.3);
  backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;
}
.modal {
  background: white; width: 100%; max-width: 440px; border-radius: 24px; padding: 28px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
  box-sizing: border-box;
}
.modal-header {
  display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;
}
.modal-header h3 { margin: 0; color: #0f172a; font-size: 22px; font-weight: 800; }
.close-modal-btn {
  background: transparent; border: none; font-size: 24px; color: #94a3b8; cursor: pointer; padding: 4px; line-height: 1;
}
.close-modal-btn:hover { color: #475569; }
.modal-description { color: #64748b; font-size: 15px; margin: 0 0 24px; line-height: 1.5; }

/* Paneles del Modal y Alertas */
.bg-light-panel {
  background: #f8fafc; padding: 16px; border-radius: 16px; border: 1px solid #e2e8f0;
}
.alert-panel {
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 13px;
  margin-bottom: 20px;
  line-height: 1.4;
  text-align: left;
  border: 1px solid;
}
.alert-danger { background-color: #fef2f2; border-color: #fee2e2; color: #991b1b; }
.alert-warning { background-color: #fffbeb; border-color: #fef3c7; color: #92400e; }
.form-group { margin-bottom: 20px; text-align: left; }
.form-label { display: block; font-weight: 700; color: #334155; margin-bottom: 8px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
.form-input {
  width: 100%; padding: 12px 14px; border: 1px solid #cbd5e1; border-radius: 12px; font-size: 15px; outline: none; color: #1e293b; background-color: white; box-sizing: border-box;
}
.form-input:focus { border-color: #0f172a; box-shadow: 0 0 0 4px rgba(15, 23, 42, 0.08); }
.form-help { display: block; color: #94a3b8; font-size: 12px; margin-top: 6px; line-height: 1.4; }

.toggle-status { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.status-active { color: #059669; font-weight: 700; font-size: 15px; }
.status-inactive { color: #dc2626; font-weight: 700; font-size: 15px; }
.btn-toggle {
  background: white; border: 1px solid #cbd5e1; padding: 8px 14px; border-radius: 10px;
  cursor: pointer; font-size: 13px; font-weight: 600; color: #475569; transition: all 0.15s;
}
.btn-toggle:hover { background: #f1f5f9; border-color: #94a3b8; color: #0f172a; }
.btn-toggle:disabled { opacity: 0.4; cursor: not-allowed; background-color: #e2e8f0; }

.modal-actions { display: flex; gap: 12px; margin-top: 28px; }
.btn-cancel, .btn-confirm {
  flex: 1; border: none; padding: 14px; border-radius: 12px; cursor: pointer; font-weight: 600; font-size: 15px; transition: all 0.15s;
}
.btn-cancel { background: #f1f5f9; color: #475569; }
.btn-cancel:hover { background: #e2e8f0; }
.btn-confirm { background: #0f172a; color: white; }
.btn-confirm:hover { background: #1e293b; }
.btn-confirm:disabled, .btn-cancel:disabled { opacity: 0.5; cursor: not-allowed; }

/* Transición */
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* --- RESPONSIVE CARD-BASED DESIGN (Móvil) --- */
@media (max-width: 768px) {
  .admin-container { padding: 16px; }
  .metrics-grid { grid-template-columns: 1fr 1fr; gap: 12px; }
  .metric-card { padding: 14px; gap: 10px; border-radius: 14px; }
  .metric-icon { width: 40px; height: 40px; font-size: 20px; border-radius: 10px; }
  .metric-value { font-size: 18px; }
  .metric-label { font-size: 11px; }

  .search-input { max-width: 100%; }
  .table-responsive { background: transparent; border: none; box-shadow: none; }

  .admin-table, .admin-table thead, .admin-table tbody, .admin-table tr, .admin-table td { display: block; width: 100%; }
  .admin-table thead { display: none; }
  .admin-table tbody { display: flex; flex-direction: column; gap: 14px; }

  .admin-table tr {
    background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); box-sizing: border-box;
  }
  .admin-table td {
    display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px dashed #e2e8f0; font-size: 14px; text-align: right;
  }
  .admin-table td:first-child {
    padding-top: 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 4px;
  }
  .admin-table td:last-child { border-bottom: none; padding-bottom: 0; }

  .whatsapp-cell { align-items: flex-end; width: 100%; }

  .mobile-label {
    display: block; color: #64748b; font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; text-align: left;
  }
  .actions-cell { justify-content: space-between !important; }
  .modal-actions { flex-direction: column-reverse; gap: 10px; }
}
</style>