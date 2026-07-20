import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Enum, Float, ForeignKey, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.types import Uuid

from app.db.session import Base


class RoleEnum(str, enum.Enum):
    ADMINISTRADOR = "ADMINISTRADOR"
    OPERADOR = "OPERADOR"
    DISPOSITIVO = "DISPOSITIVO"
    USUARIO = "USUARIO"


class RecordStatusEnum(str, enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"


class TipoAccesoEnum(str, enum.Enum):
    ENTRADA = "ENTRADA"
    SALIDA = "SALIDA"


class EstadoEscaneoEnum(str, enum.Enum):
    DETECTADO = "DETECTADO"
    BAJA_CONFIANZA = "BAJA_CONFIANZA"
    ERROR = "ERROR"
    MANUAL = "MANUAL"


class UbicacionVehiculoEnum(str, enum.Enum):
    DENTRO = "DENTRO"
    FUERA = "FUERA"


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    nombre = Column(String, nullable=False)
    apellido_paterno = Column(String, nullable=False)
    apellido_materno = Column(String, nullable=True)
    carnet = Column(String, unique=True, index=True, nullable=False)
    contrasena_hash = Column(String, nullable=False)
    rol = Column(Enum(RoleEnum), default=RoleEnum.USUARIO, nullable=False)
    esta_activo = Column(Boolean, default=True, nullable=False)
    creado_el = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    actualizado_el = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    vehiculos = relationship("Vehiculo", back_populates="propietario")
    accesos_gestionados = relationship("Acceso", back_populates="operador")


class Marca(Base):
    __tablename__ = "marcas"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    nombre = Column(String, unique=True, nullable=False)
    creado_el = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)


class TipoVehiculo(Base):
    __tablename__ = "tipos_vehiculo"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    nombre = Column(String, unique=True, nullable=False)
    creado_el = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)


class Vehiculo(Base):
    __tablename__ = "vehiculos"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    placa = Column(String, unique=True, index=True, nullable=False)
    color = Column(String, nullable=False)
    marca_id = Column(Uuid, ForeignKey("marcas.id"), nullable=False)
    tipo_vehiculo_id = Column(Uuid, ForeignKey("tipos_vehiculo.id"), nullable=False)
    propietario_usuario_id = Column(Uuid, ForeignKey("usuarios.id"), nullable=False)
    esta_activo = Column(Boolean, default=True, nullable=False)
    creado_el = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    actualizado_el = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    marca = relationship("Marca")
    tipo = relationship("TipoVehiculo")
    propietario = relationship("Usuario", back_populates="vehiculos")
    escaneos = relationship("Escaneado", back_populates="vehiculo")
    estado_campus = relationship("EstadoCampus", back_populates="vehiculo", uselist=False)


class EstadoCampus(Base):
    __tablename__ = "estado_campus"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    vehiculo_id = Column(Uuid, ForeignKey("vehiculos.id"), unique=True, nullable=False)
    estado = Column(Enum(UbicacionVehiculoEnum), nullable=False)
    ultimo_acceso_id = Column(Uuid, ForeignKey("accesos.id"), nullable=False)
    actualizado_el = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True, nullable=False)

    vehiculo = relationship("Vehiculo", back_populates="estado_campus")
    ultimo_acceso = relationship("Acceso", foreign_keys=[ultimo_acceso_id])


class TipoDispositivo(Base):
    __tablename__ = "tipos_dispositivo"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    nombre = Column(String, nullable=False) # E.g. "Entrada", "Salida"
    creado_el = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)


class Dispositivo(Base):
    __tablename__ = "dispositivos"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    nombre = Column(String, nullable=False)
    ubicacion = Column(String, nullable=False)
    tipo_dispositivo_id = Column(Uuid, ForeignKey("tipos_dispositivo.id"), nullable=False)
    esta_activo = Column(Boolean, default=True, nullable=False)
    creado_el = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    actualizado_el = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    tipo = relationship("TipoDispositivo")
    escaneos = relationship("Escaneado", back_populates="dispositivo")


class Escaneado(Base):
    __tablename__ = "escaneados"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    ruta_imagen = Column(String, nullable=True)
    placa_detectada = Column(String, nullable=True)
    placa_normalizada = Column(String, index=True, nullable=True)
    confianza = Column(Float, nullable=True)
    estado = Column(Enum(EstadoEscaneoEnum), nullable=False, default=EstadoEscaneoEnum.DETECTADO)
    dispositivo_id = Column(Uuid, ForeignKey("dispositivos.id"), nullable=True)
    vehiculo_id = Column(Uuid, ForeignKey("vehiculos.id"), nullable=True)
    creado_el = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True, nullable=False)

    dispositivo = relationship("Dispositivo", back_populates="escaneos")
    vehiculo = relationship("Vehiculo", back_populates="escaneos")
    acceso = relationship("Acceso", back_populates="escaneado", uselist=False)
    acceso_visitante = relationship("AccesoVisitante", back_populates="escaneado", uselist=False)


class AccesoVisitante(Base):
    __tablename__ = "accesos_visitantes"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    nombre_conductor = Column(String, nullable=False)
    carnet_conductor = Column(String, index=True, nullable=False)
    motivo = Column(String, nullable=True)
    institucion_empresa = Column(String, nullable=True)
    escaneado_id = Column(Uuid, ForeignKey("escaneados.id"), nullable=False)

    escaneado = relationship("Escaneado", back_populates="acceso_visitante")


class Acceso(Base):
    __tablename__ = "accesos"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    tipo_acceso = Column(Enum(TipoAccesoEnum), nullable=False)
    ubicacion = Column(String, nullable=False)
    escaneado_id = Column(Uuid, ForeignKey("escaneados.id"), nullable=False)
    operador_usuario_id = Column(Uuid, ForeignKey("usuarios.id"), nullable=True)
    creado_el = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True, nullable=False)

    escaneado = relationship("Escaneado", back_populates="acceso")
    operador = relationship("Usuario", back_populates="accesos_gestionados")
