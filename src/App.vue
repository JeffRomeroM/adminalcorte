<template>
  <div class="admin-container">
    <div class="admin-header">
      <h1 class="page-title">Control de Usuarios</h1>
      <p class="page-subtitle">
        Activa o desactiva accesos de forma directa.
      </p>
    </div>

    <div class="search-box">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Buscar negocio, propietario o WhatsApp..."
      />
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Cargando usuarios...</p>
    </div>

    <div v-else class="table-responsive">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Negocio</th>
            <th>Propietario</th>
            <th>WhatsApp</th>
            <th class="text-center">Activo</th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="user in usuariosFiltrados"
            :key="user.id"
          >
            <td>
              <strong class="business-name">
                Taller {{ user.nombre_negocio || 'Sin nombre' }}
              </strong>
            </td>

            <td>
              <span class="mobile-label">Propietario:</span>
              {{ user.nombre_propietario || '-' }}
            </td>

            <td>
              <span class="mobile-label">WhatsApp:</span>
              {{ user.whatsapp || '-' }}
            </td>

            <td class="text-center actions-cell">
              <span class="mobile-label">Activo:</span>
              <label class="switch">
                <input
                  type="checkbox"
                  :checked="user.activo"
                  @click.prevent="abrirModal(user)"
                />
                <span class="slider round"></span>
              </label>
            </td>
          </tr>

          <tr v-if="usuariosFiltrados.length === 0">
            <td colspan="4" class="empty-row">
              No se encontraron usuarios.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <Transition name="fade">
      <div v-if="showModal" class="modal-overlay" @click.self="cerrarModal">
        <div class="modal">
          <h3>Confirmar Cambio</h3>
          <p>
            ¿Estás seguro de que deseas <strong>{{ nuevoEstado ? 'activar' : 'desactivar' }}</strong> el acceso para 
            <strong>Taller {{ usuarioSeleccionado?.nombre_negocio }}</strong>?
          </p>
          <div class="modal-actions">
            <button class="btn-cancel" @click="cerrarModal" :disabled="isUpdating">
              Cancelar
            </button>
            <button class="btn-confirm" @click="confirmarCambio" :disabled="isUpdating">
              {{ isUpdating ? 'Guardando...' : 'Confirmar' }}
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

// Inicialización de Supabase
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY
)

// Estados de la UI
const loading = ref(true)
const isUpdating = ref(false)
const searchQuery = ref('')
const usuarios = ref([])

// Estados del Modal
const showModal = ref(false)
const usuarioSeleccionado = ref(null)
const nuevoEstado = ref(false)

const abrirModal = (user) => {
  usuarioSeleccionado.value = user
  nuevoEstado.value = !user.activo // Propone el estado opuesto al actual
  showModal.value = true
}

const cerrarModal = () => {
  showModal.value = false
  usuarioSeleccionado.value = null
}

const confirmarCambio = async () => {
  if (!usuarioSeleccionado.value) return

  try {
    isUpdating.value = true
    
    const { error } = await supabase
      .from('profiles')
      .update({ activo: nuevoEstado.value })
      .eq('id', usuarioSeleccionado.value.id)

    if (error) throw error

    // Reflejamos el cambio en el estado local solo si la DB respondió con éxito
    usuarioSeleccionado.value.activo = nuevoEstado.value
    cerrarModal()
  } catch (error) {
    console.error('Error al actualizar usuario:', error)
    alert('No se pudo actualizar el estado del usuario.')
  } finally {
    isUpdating.value = false
  }
}

const fetchUsuarios = async () => {
  try {
    loading.value = true
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('nombre_negocio', { ascending: true })

    if (error) throw error
    usuarios.value = data || []
  } catch (error) {
    console.error('Error al cargar usuarios:', error)
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
.admin-container {
  max-width: 1200px;
  margin: auto;
  padding: 24px;
}

.admin-header {
  margin-bottom: 24px;
}

.page-title {
  font-size: 28px;
  font-weight: 800;
  color: #003034;
  margin: 0;
}

.page-subtitle {
  color: #64748b;
  margin-top: 6px;
  font-size: 15px;
}

.search-box {
  margin-bottom: 24px;
}

.search-box input {
  width: 100%;
  max-width: 400px;
  padding: 12px 16px;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  outline: none;
  font-size: 15px;
  transition: all 0.2s ease;
}

.search-box input:focus {
  border-color: #003034;
  box-shadow: 0 0 0 3px rgba(0, 48, 52, 0.15);
}

/* Tabla Estilo Desktop */
.table-responsive {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
}

.admin-table {
  width: 100%;
  border-collapse: collapse;
}

.admin-table th {
  background: #f8fafc;
  color: #475569;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: .5px;
  padding: 16px 20px;
  text-align: left;
  border-bottom: 1px solid #e2e8f0;
  font-weight: 700;
}

.admin-table td {
  padding: 18px 20px;
  border-bottom: 1px solid #f1f5f9;
  color: #334155;
  font-size: 15px;
}

.admin-table tr:last-child td {
  border-bottom: none;
}

.admin-table tr:hover {
  background: #f8fafc;
}

.business-name {
  color: #003034;
}

.text-center {
  text-align: center;
}

.mobile-label {
  display: none;
}

/* Loader */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 60px 20px;
  color: #64748b;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #cbd5e1;
  border-top-color: #003034;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-row {
  text-align: center !important;
  color: #94a3b8;
  padding: 40px !important;
}

/* Switch UI */
.switch {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 24px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background: #cbd5e1;
  transition: .25s ease;
}

.slider:before {
  position: absolute;
  content: "";
  width: 18px;
  height: 18px;
  left: 3px;
  bottom: 3px;
  background: white;
  transition: .25s ease;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

input:checked + .slider {
  background: #16a34a;
}

input:checked + .slider:before {
  transform: translateX(24px);
}

.slider.round {
  border-radius: 50px;
}

.slider.round:before {
  border-radius: 50%;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 48, 52, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
}

.modal {
  background: white;
  width: 100%;
  max-width: 400px;
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.modal h3 {
  margin: 0 0 10px;
  color: #003034;
  font-size: 20px;
  font-weight: 700;
}

.modal p {
  color: #475569;
  font-size: 15px;
  line-height: 1.5;
  margin: 0 0 24px;
}

.modal-actions {
  display: flex;
  gap: 12px;
}

.btn-cancel,
.btn-confirm {
  flex: 1;
  border: none;
  padding: 12px;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 600;
  font-size: 15px;
  transition: background 0.2s;
}

.btn-cancel {
  background: #f1f5f9;
  color: #475569;
}

.btn-cancel:hover {
  background: #e2e8f0;
}

.btn-confirm {
  background: #003034;
  color: white;
}

.btn-confirm:hover {
  background: #001f22;
}

.btn-confirm:disabled, .btn-cancel:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Transiciones Animadas */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* --- RESPONSIVE CARD-BASED DESIGN (Profesional) --- */
@media (max-width: 768px) {
  .admin-container {
    padding: 16px;
  }

  .search-box input {
    max-width: 89%;
  }

  .table-responsive {
    background: transparent;
    border: none;
    box-shadow: none;
    overflow: visible;
  }

  /* Transformamos la tabla en un listado de Tarjetas Limpias */
  .admin-table, 
  .admin-table thead, 
  .admin-table tbody, 
  .admin-table tr, 
  .admin-table td {
    display: block;
    width: 100%;
  }

  .admin-table thead {
    display: none; /* Escondemos cabeceras repetitivas */
  }

  .admin-table tbody {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .admin-table tr {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    padding: 16px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.02);
    box-sizing: border-box;
  }

  .admin-table tr:hover {
    background: white;
  }

  .admin-table td {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 0;
    border-bottom: 1px dashed #f1f5f9;
    font-size: 14px;
    text-align: right;
  }

  .admin-table td:first-child {
    padding-top: 0;
    font-size: 16px;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 12px;
    margin-bottom: 6px;
  }

  .admin-table td:last-child {
    border-bottom: none;
    padding-bottom: 0;
    margin-top: 4px;
  }

  /* Labels exclusivos de Mobile */
  .mobile-label {
    display: block;
    color: #64748b;
    font-weight: 600;
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: .5px;
    text-align: left;
  }

  .actions-cell {
    text-align: right;
  }

  /* Ajustes del Modal en Móvil */
  .modal {
    padding: 20px;
    border-radius: 16px;
  }

  .modal-actions {
    flex-direction: column-reverse; /* Cancelar abajo, Confirmar arriba */
    gap: 8px;
  }
  
  .btn-cancel, .btn-confirm {
    width: 100%;
  }
}
</style>