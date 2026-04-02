using System;
using System.Runtime.CompilerServices;
using UnityEngine.Internal;
using UnityEngine.Scripting;

namespace UnityEngine
{
	public sealed class ParticleSystem : Component
	{
		public struct Burst
		{
			private float m_Time;

			private short m_MinCount;

			private short m_MaxCount;

			public float time
			{
				get
				{
					return m_Time;
				}
				set
				{
					m_Time = value;
				}
			}

			public short minCount
			{
				get
				{
					return m_MinCount;
				}
				set
				{
					m_MinCount = value;
				}
			}

			public short maxCount
			{
				get
				{
					return m_MaxCount;
				}
				set
				{
					m_MaxCount = value;
				}
			}

			public Burst(float _time, short _count)
			{
				m_Time = _time;
				m_MinCount = _count;
				m_MaxCount = _count;
			}

			public Burst(float _time, short _minCount, short _maxCount)
			{
				m_Time = _time;
				m_MinCount = _minCount;
				m_MaxCount = _maxCount;
			}
		}

		public struct MinMaxCurve
		{
			private ParticleSystemCurveMode m_Mode;

			private float m_CurveScalar;

			private AnimationCurve m_CurveMin;

			private AnimationCurve m_CurveMax;

			private float m_ConstantMin;

			private float m_ConstantMax;

			public ParticleSystemCurveMode mode
			{
				get
				{
					return m_Mode;
				}
				set
				{
					m_Mode = value;
				}
			}

			public float curveScalar
			{
				get
				{
					return m_CurveScalar;
				}
				set
				{
					m_CurveScalar = value;
				}
			}

			public AnimationCurve curveMax
			{
				get
				{
					return m_CurveMax;
				}
				set
				{
					m_CurveMax = value;
				}
			}

			public AnimationCurve curveMin
			{
				get
				{
					return m_CurveMin;
				}
				set
				{
					m_CurveMin = value;
				}
			}

			public float constantMax
			{
				get
				{
					return m_ConstantMax;
				}
				set
				{
					m_ConstantMax = value;
				}
			}

			public float constantMin
			{
				get
				{
					return m_ConstantMin;
				}
				set
				{
					m_ConstantMin = value;
				}
			}

			public float constant
			{
				get
				{
					return m_ConstantMax;
				}
				set
				{
					m_ConstantMax = value;
				}
			}

			public AnimationCurve curve
			{
				get
				{
					return m_CurveMax;
				}
				set
				{
					m_CurveMax = value;
				}
			}

			public MinMaxCurve(float constant)
			{
				m_Mode = ParticleSystemCurveMode.Constant;
				m_CurveScalar = 0f;
				m_CurveMin = null;
				m_CurveMax = null;
				m_ConstantMin = 0f;
				m_ConstantMax = constant;
			}

			public MinMaxCurve(float scalar, AnimationCurve curve)
			{
				m_Mode = ParticleSystemCurveMode.Curve;
				m_CurveScalar = scalar;
				m_CurveMin = null;
				m_CurveMax = curve;
				m_ConstantMin = 0f;
				m_ConstantMax = 0f;
			}

			public MinMaxCurve(float scalar, AnimationCurve min, AnimationCurve max)
			{
				m_Mode = ParticleSystemCurveMode.TwoCurves;
				m_CurveScalar = scalar;
				m_CurveMin = min;
				m_CurveMax = max;
				m_ConstantMin = 0f;
				m_ConstantMax = 0f;
			}

			public MinMaxCurve(float min, float max)
			{
				m_Mode = ParticleSystemCurveMode.TwoConstants;
				m_CurveScalar = 0f;
				m_CurveMin = null;
				m_CurveMax = null;
				m_ConstantMin = min;
				m_ConstantMax = max;
			}

			public float Evaluate(float time)
			{
				return Evaluate(time, 1f);
			}

			public float Evaluate(float time, float lerpFactor)
			{
				time = Mathf.Clamp(time, 0f, 1f);
				lerpFactor = Mathf.Clamp(lerpFactor, 0f, 1f);
				if (m_Mode == ParticleSystemCurveMode.Constant)
				{
					return m_ConstantMax;
				}
				if (m_Mode == ParticleSystemCurveMode.TwoConstants)
				{
					return Mathf.Lerp(m_ConstantMin, m_ConstantMax, lerpFactor);
				}
				float num = m_CurveMax.Evaluate(time) * m_CurveScalar;
				if (m_Mode == ParticleSystemCurveMode.TwoCurves)
				{
					return Mathf.Lerp(m_CurveMin.Evaluate(time) * m_CurveScalar, num, lerpFactor);
				}
				return num;
			}

			public static implicit operator MinMaxCurve(float constant)
			{
				return new MinMaxCurve(constant);
			}
		}

		public struct MinMaxGradient
		{
			private ParticleSystemGradientMode m_Mode;

			private Gradient m_GradientMin;

			private Gradient m_GradientMax;

			private Color m_ColorMin;

			private Color m_ColorMax;

			public ParticleSystemGradientMode mode
			{
				get
				{
					return m_Mode;
				}
				set
				{
					m_Mode = value;
				}
			}

			public Gradient gradientMax
			{
				get
				{
					return m_GradientMax;
				}
				set
				{
					m_GradientMax = value;
				}
			}

			public Gradient gradientMin
			{
				get
				{
					return m_GradientMin;
				}
				set
				{
					m_GradientMin = value;
				}
			}

			public Color colorMax
			{
				get
				{
					return m_ColorMax;
				}
				set
				{
					m_ColorMax = value;
				}
			}

			public Color colorMin
			{
				get
				{
					return m_ColorMin;
				}
				set
				{
					m_ColorMin = value;
				}
			}

			public Color color
			{
				get
				{
					return m_ColorMax;
				}
				set
				{
					m_ColorMax = value;
				}
			}

			public Gradient gradient
			{
				get
				{
					return m_GradientMax;
				}
				set
				{
					m_GradientMax = value;
				}
			}

			public MinMaxGradient(Color color)
			{
				m_Mode = ParticleSystemGradientMode.Color;
				m_GradientMin = null;
				m_GradientMax = null;
				m_ColorMin = Color.black;
				m_ColorMax = color;
			}

			public MinMaxGradient(Gradient gradient)
			{
				m_Mode = ParticleSystemGradientMode.Gradient;
				m_GradientMin = null;
				m_GradientMax = gradient;
				m_ColorMin = Color.black;
				m_ColorMax = Color.black;
			}

			public MinMaxGradient(Color min, Color max)
			{
				m_Mode = ParticleSystemGradientMode.TwoColors;
				m_GradientMin = null;
				m_GradientMax = null;
				m_ColorMin = min;
				m_ColorMax = max;
			}

			public MinMaxGradient(Gradient min, Gradient max)
			{
				m_Mode = ParticleSystemGradientMode.TwoGradients;
				m_GradientMin = min;
				m_GradientMax = max;
				m_ColorMin = Color.black;
				m_ColorMax = Color.black;
			}

			public Color Evaluate(float time)
			{
				return Evaluate(time, 1f);
			}

			public Color Evaluate(float time, float lerpFactor)
			{
				time = Mathf.Clamp(time, 0f, 1f);
				lerpFactor = Mathf.Clamp(lerpFactor, 0f, 1f);
				if (m_Mode == ParticleSystemGradientMode.Color)
				{
					return m_ColorMax;
				}
				if (m_Mode == ParticleSystemGradientMode.TwoColors)
				{
					return Color.Lerp(m_ColorMin, m_ColorMax, lerpFactor);
				}
				Color color = m_GradientMax.Evaluate(time);
				if (m_Mode == ParticleSystemGradientMode.TwoGradients)
				{
					return Color.Lerp(m_GradientMin.Evaluate(time), color, lerpFactor);
				}
				return color;
			}

			public static implicit operator MinMaxGradient(Color color)
			{
				return new MinMaxGradient(color);
			}

			public static implicit operator MinMaxGradient(Gradient gradient)
			{
				return new MinMaxGradient(gradient);
			}
		}

		public struct EmissionModule
		{
			private ParticleSystem m_ParticleSystem;

			public bool enabled
			{
				get
				{
					return GetEnabled(m_ParticleSystem);
				}
				set
				{
					SetEnabled(m_ParticleSystem, value);
				}
			}

			public MinMaxCurve rate
			{
				get
				{
					MinMaxCurve curve = default(MinMaxCurve);
					GetRate(m_ParticleSystem, ref curve);
					return curve;
				}
				set
				{
					SetRate(m_ParticleSystem, ref value);
				}
			}

			public ParticleSystemEmissionType type
			{
				get
				{
					return (ParticleSystemEmissionType)GetType(m_ParticleSystem);
				}
				set
				{
					SetType(m_ParticleSystem, (int)value);
				}
			}

			public int burstCount
			{
				get
				{
					return GetBurstCount(m_ParticleSystem);
				}
			}

			internal EmissionModule(ParticleSystem particleSystem)
			{
				m_ParticleSystem = particleSystem;
			}

			public void SetBursts(Burst[] bursts)
			{
				SetBursts(m_ParticleSystem, bursts, bursts.Length);
			}

			public void SetBursts(Burst[] bursts, int size)
			{
				SetBursts(m_ParticleSystem, bursts, size);
			}

			public int GetBursts(Burst[] bursts)
			{
				return GetBursts(m_ParticleSystem, bursts);
			}

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetEnabled(ParticleSystem system, bool value);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern bool GetEnabled(ParticleSystem system);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetType(ParticleSystem system, int value);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern int GetType(ParticleSystem system);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern int GetBurstCount(ParticleSystem system);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetRate(ParticleSystem system, ref MinMaxCurve curve);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void GetRate(ParticleSystem system, ref MinMaxCurve curve);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetBursts(ParticleSystem system, Burst[] bursts, int size);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern int GetBursts(ParticleSystem system, Burst[] bursts);
		}

		public struct ShapeModule
		{
			private ParticleSystem m_ParticleSystem;

			public bool enabled
			{
				get
				{
					return GetEnabled(m_ParticleSystem);
				}
				set
				{
					SetEnabled(m_ParticleSystem, value);
				}
			}

			public ParticleSystemShapeType shapeType
			{
				get
				{
					return (ParticleSystemShapeType)GetShapeType(m_ParticleSystem);
				}
				set
				{
					SetShapeType(m_ParticleSystem, (int)value);
				}
			}

			public bool randomDirection
			{
				get
				{
					return GetRandomDirection(m_ParticleSystem);
				}
				set
				{
					SetRandomDirection(m_ParticleSystem, value);
				}
			}

			public float radius
			{
				get
				{
					return GetRadius(m_ParticleSystem);
				}
				set
				{
					SetRadius(m_ParticleSystem, value);
				}
			}

			public float angle
			{
				get
				{
					return GetAngle(m_ParticleSystem);
				}
				set
				{
					SetAngle(m_ParticleSystem, value);
				}
			}

			public float length
			{
				get
				{
					return GetLength(m_ParticleSystem);
				}
				set
				{
					SetLength(m_ParticleSystem, value);
				}
			}

			public Vector3 box
			{
				get
				{
					return GetBox(m_ParticleSystem);
				}
				set
				{
					SetBox(m_ParticleSystem, value);
				}
			}

			public ParticleSystemMeshShapeType meshShapeType
			{
				get
				{
					return (ParticleSystemMeshShapeType)GetMeshShapeType(m_ParticleSystem);
				}
				set
				{
					SetMeshShapeType(m_ParticleSystem, (int)value);
				}
			}

			public Mesh mesh
			{
				get
				{
					return GetMesh(m_ParticleSystem);
				}
				set
				{
					SetMesh(m_ParticleSystem, value);
				}
			}

			public MeshRenderer meshRenderer
			{
				get
				{
					return GetMeshRenderer(m_ParticleSystem);
				}
				set
				{
					SetMeshRenderer(m_ParticleSystem, value);
				}
			}

			public SkinnedMeshRenderer skinnedMeshRenderer
			{
				get
				{
					return GetSkinnedMeshRenderer(m_ParticleSystem);
				}
				set
				{
					SetSkinnedMeshRenderer(m_ParticleSystem, value);
				}
			}

			public bool useMeshMaterialIndex
			{
				get
				{
					return GetUseMeshMaterialIndex(m_ParticleSystem);
				}
				set
				{
					SetUseMeshMaterialIndex(m_ParticleSystem, value);
				}
			}

			public int meshMaterialIndex
			{
				get
				{
					return GetMeshMaterialIndex(m_ParticleSystem);
				}
				set
				{
					SetMeshMaterialIndex(m_ParticleSystem, value);
				}
			}

			public bool useMeshColors
			{
				get
				{
					return GetUseMeshColors(m_ParticleSystem);
				}
				set
				{
					SetUseMeshColors(m_ParticleSystem, value);
				}
			}

			public float normalOffset
			{
				get
				{
					return GetNormalOffset(m_ParticleSystem);
				}
				set
				{
					SetNormalOffset(m_ParticleSystem, value);
				}
			}

			public float arc
			{
				get
				{
					return GetArc(m_ParticleSystem);
				}
				set
				{
					SetArc(m_ParticleSystem, value);
				}
			}

			internal ShapeModule(ParticleSystem particleSystem)
			{
				m_ParticleSystem = particleSystem;
			}

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetEnabled(ParticleSystem system, bool value);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern bool GetEnabled(ParticleSystem system);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetShapeType(ParticleSystem system, int value);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern int GetShapeType(ParticleSystem system);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetRandomDirection(ParticleSystem system, bool value);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern bool GetRandomDirection(ParticleSystem system);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetRadius(ParticleSystem system, float value);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern float GetRadius(ParticleSystem system);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetAngle(ParticleSystem system, float value);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern float GetAngle(ParticleSystem system);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetLength(ParticleSystem system, float value);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern float GetLength(ParticleSystem system);

			private static void SetBox(ParticleSystem system, Vector3 value)
			{
				INTERNAL_CALL_SetBox(system, ref value);
			}

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void INTERNAL_CALL_SetBox(ParticleSystem system, ref Vector3 value);

			private static Vector3 GetBox(ParticleSystem system)
			{
				Vector3 value;
				INTERNAL_CALL_GetBox(system, out value);
				return value;
			}

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void INTERNAL_CALL_GetBox(ParticleSystem system, out Vector3 value);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetMeshShapeType(ParticleSystem system, int value);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern int GetMeshShapeType(ParticleSystem system);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetMesh(ParticleSystem system, Mesh value);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern Mesh GetMesh(ParticleSystem system);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetMeshRenderer(ParticleSystem system, MeshRenderer value);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern MeshRenderer GetMeshRenderer(ParticleSystem system);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetSkinnedMeshRenderer(ParticleSystem system, SkinnedMeshRenderer value);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern SkinnedMeshRenderer GetSkinnedMeshRenderer(ParticleSystem system);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetUseMeshMaterialIndex(ParticleSystem system, bool value);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern bool GetUseMeshMaterialIndex(ParticleSystem system);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetMeshMaterialIndex(ParticleSystem system, int value);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern int GetMeshMaterialIndex(ParticleSystem system);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetUseMeshColors(ParticleSystem system, bool value);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern bool GetUseMeshColors(ParticleSystem system);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetNormalOffset(ParticleSystem system, float value);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern float GetNormalOffset(ParticleSystem system);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetArc(ParticleSystem system, float value);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern float GetArc(ParticleSystem system);
		}

		public struct VelocityOverLifetimeModule
		{
			private ParticleSystem m_ParticleSystem;

			public bool enabled
			{
				get
				{
					return GetEnabled(m_ParticleSystem);
				}
				set
				{
					SetEnabled(m_ParticleSystem, value);
				}
			}

			public MinMaxCurve x
			{
				get
				{
					MinMaxCurve curve = default(MinMaxCurve);
					GetX(m_ParticleSystem, ref curve);
					return curve;
				}
				set
				{
					SetX(m_ParticleSystem, ref value);
				}
			}

			public MinMaxCurve y
			{
				get
				{
					MinMaxCurve curve = default(MinMaxCurve);
					GetY(m_ParticleSystem, ref curve);
					return curve;
				}
				set
				{
					SetY(m_ParticleSystem, ref value);
				}
			}

			public MinMaxCurve z
			{
				get
				{
					MinMaxCurve curve = default(MinMaxCurve);
					GetZ(m_ParticleSystem, ref curve);
					return curve;
				}
				set
				{
					SetZ(m_ParticleSystem, ref value);
				}
			}

			public ParticleSystemSimulationSpace space
			{
				get
				{
					return GetWorldSpace(m_ParticleSystem) ? ParticleSystemSimulationSpace.World : ParticleSystemSimulationSpace.Local;
				}
				set
				{
					SetWorldSpace(m_ParticleSystem, value == ParticleSystemSimulationSpace.World);
				}
			}

			internal VelocityOverLifetimeModule(ParticleSystem particleSystem)
			{
				m_ParticleSystem = particleSystem;
			}

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetEnabled(ParticleSystem system, bool value);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern bool GetEnabled(ParticleSystem system);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetX(ParticleSystem system, ref MinMaxCurve curve);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void GetX(ParticleSystem system, ref MinMaxCurve curve);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetY(ParticleSystem system, ref MinMaxCurve curve);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void GetY(ParticleSystem system, ref MinMaxCurve curve);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetZ(ParticleSystem system, ref MinMaxCurve curve);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void GetZ(ParticleSystem system, ref MinMaxCurve curve);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetWorldSpace(ParticleSystem system, bool value);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern bool GetWorldSpace(ParticleSystem system);
		}

		public struct LimitVelocityOverLifetimeModule
		{
			private ParticleSystem m_ParticleSystem;

			public bool enabled
			{
				get
				{
					return GetEnabled(m_ParticleSystem);
				}
				set
				{
					SetEnabled(m_ParticleSystem, value);
				}
			}

			public MinMaxCurve limitX
			{
				get
				{
					MinMaxCurve curve = default(MinMaxCurve);
					GetX(m_ParticleSystem, ref curve);
					return curve;
				}
				set
				{
					SetX(m_ParticleSystem, ref value);
				}
			}

			public MinMaxCurve limitY
			{
				get
				{
					MinMaxCurve curve = default(MinMaxCurve);
					GetY(m_ParticleSystem, ref curve);
					return curve;
				}
				set
				{
					SetY(m_ParticleSystem, ref value);
				}
			}

			public MinMaxCurve limitZ
			{
				get
				{
					MinMaxCurve curve = default(MinMaxCurve);
					GetZ(m_ParticleSystem, ref curve);
					return curve;
				}
				set
				{
					SetZ(m_ParticleSystem, ref value);
				}
			}

			public MinMaxCurve limit
			{
				get
				{
					MinMaxCurve curve = default(MinMaxCurve);
					GetMagnitude(m_ParticleSystem, ref curve);
					return curve;
				}
				set
				{
					SetMagnitude(m_ParticleSystem, ref value);
				}
			}

			public float dampen
			{
				get
				{
					return GetDampen(m_ParticleSystem);
				}
				set
				{
					SetDampen(m_ParticleSystem, value);
				}
			}

			public bool separateAxes
			{
				get
				{
					return GetSeparateAxes(m_ParticleSystem);
				}
				set
				{
					SetSeparateAxes(m_ParticleSystem, value);
				}
			}

			public ParticleSystemSimulationSpace space
			{
				get
				{
					return GetWorldSpace(m_ParticleSystem) ? ParticleSystemSimulationSpace.World : ParticleSystemSimulationSpace.Local;
				}
				set
				{
					SetWorldSpace(m_ParticleSystem, value == ParticleSystemSimulationSpace.World);
				}
			}

			internal LimitVelocityOverLifetimeModule(ParticleSystem particleSystem)
			{
				m_ParticleSystem = particleSystem;
			}

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetEnabled(ParticleSystem system, bool value);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern bool GetEnabled(ParticleSystem system);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetX(ParticleSystem system, ref MinMaxCurve curve);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void GetX(ParticleSystem system, ref MinMaxCurve curve);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetY(ParticleSystem system, ref MinMaxCurve curve);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void GetY(ParticleSystem system, ref MinMaxCurve curve);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetZ(ParticleSystem system, ref MinMaxCurve curve);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void GetZ(ParticleSystem system, ref MinMaxCurve curve);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetMagnitude(ParticleSystem system, ref MinMaxCurve curve);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void GetMagnitude(ParticleSystem system, ref MinMaxCurve curve);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetDampen(ParticleSystem system, float value);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern float GetDampen(ParticleSystem system);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetSeparateAxes(ParticleSystem system, bool value);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern bool GetSeparateAxes(ParticleSystem system);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetWorldSpace(ParticleSystem system, bool value);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern bool GetWorldSpace(ParticleSystem system);
		}

		public struct InheritVelocityModule
		{
			private ParticleSystem m_ParticleSystem;

			public bool enabled
			{
				get
				{
					return GetEnabled(m_ParticleSystem);
				}
				set
				{
					SetEnabled(m_ParticleSystem, value);
				}
			}

			public ParticleSystemInheritVelocityMode mode
			{
				get
				{
					return (ParticleSystemInheritVelocityMode)GetMode(m_ParticleSystem);
				}
				set
				{
					SetMode(m_ParticleSystem, (int)value);
				}
			}

			public MinMaxCurve curve
			{
				get
				{
					MinMaxCurve result = default(MinMaxCurve);
					GetCurve(m_ParticleSystem, ref result);
					return result;
				}
				set
				{
					SetCurve(m_ParticleSystem, ref value);
				}
			}

			internal InheritVelocityModule(ParticleSystem particleSystem)
			{
				m_ParticleSystem = particleSystem;
			}

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetEnabled(ParticleSystem system, bool value);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern bool GetEnabled(ParticleSystem system);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetMode(ParticleSystem system, int value);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern int GetMode(ParticleSystem system);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetCurve(ParticleSystem system, ref MinMaxCurve curve);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void GetCurve(ParticleSystem system, ref MinMaxCurve curve);
		}

		public struct ForceOverLifetimeModule
		{
			private ParticleSystem m_ParticleSystem;

			public bool enabled
			{
				get
				{
					return GetEnabled(m_ParticleSystem);
				}
				set
				{
					SetEnabled(m_ParticleSystem, value);
				}
			}

			public MinMaxCurve x
			{
				get
				{
					MinMaxCurve curve = default(MinMaxCurve);
					GetX(m_ParticleSystem, ref curve);
					return curve;
				}
				set
				{
					SetX(m_ParticleSystem, ref value);
				}
			}

			public MinMaxCurve y
			{
				get
				{
					MinMaxCurve curve = default(MinMaxCurve);
					GetY(m_ParticleSystem, ref curve);
					return curve;
				}
				set
				{
					SetY(m_ParticleSystem, ref value);
				}
			}

			public MinMaxCurve z
			{
				get
				{
					MinMaxCurve curve = default(MinMaxCurve);
					GetZ(m_ParticleSystem, ref curve);
					return curve;
				}
				set
				{
					SetZ(m_ParticleSystem, ref value);
				}
			}

			public ParticleSystemSimulationSpace space
			{
				get
				{
					return GetWorldSpace(m_ParticleSystem) ? ParticleSystemSimulationSpace.World : ParticleSystemSimulationSpace.Local;
				}
				set
				{
					SetWorldSpace(m_ParticleSystem, value == ParticleSystemSimulationSpace.World);
				}
			}

			public bool randomized
			{
				get
				{
					return GetRandomized(m_ParticleSystem);
				}
				set
				{
					SetRandomized(m_ParticleSystem, value);
				}
			}

			internal ForceOverLifetimeModule(ParticleSystem particleSystem)
			{
				m_ParticleSystem = particleSystem;
			}

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetEnabled(ParticleSystem system, bool value);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern bool GetEnabled(ParticleSystem system);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetX(ParticleSystem system, ref MinMaxCurve curve);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void GetX(ParticleSystem system, ref MinMaxCurve curve);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetY(ParticleSystem system, ref MinMaxCurve curve);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void GetY(ParticleSystem system, ref MinMaxCurve curve);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetZ(ParticleSystem system, ref MinMaxCurve curve);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void GetZ(ParticleSystem system, ref MinMaxCurve curve);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetWorldSpace(ParticleSystem system, bool value);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern bool GetWorldSpace(ParticleSystem system);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetRandomized(ParticleSystem system, bool value);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern bool GetRandomized(ParticleSystem system);
		}

		public struct ColorOverLifetimeModule
		{
			private ParticleSystem m_ParticleSystem;

			public bool enabled
			{
				get
				{
					return GetEnabled(m_ParticleSystem);
				}
				set
				{
					SetEnabled(m_ParticleSystem, value);
				}
			}

			public MinMaxGradient color
			{
				get
				{
					MinMaxGradient gradient = default(MinMaxGradient);
					GetColor(m_ParticleSystem, ref gradient);
					return gradient;
				}
				set
				{
					SetColor(m_ParticleSystem, ref value);
				}
			}

			internal ColorOverLifetimeModule(ParticleSystem particleSystem)
			{
				m_ParticleSystem = particleSystem;
			}

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetEnabled(ParticleSystem system, bool value);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern bool GetEnabled(ParticleSystem system);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetColor(ParticleSystem system, ref MinMaxGradient gradient);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void GetColor(ParticleSystem system, ref MinMaxGradient gradient);
		}

		public struct ColorBySpeedModule
		{
			private ParticleSystem m_ParticleSystem;

			public bool enabled
			{
				get
				{
					return GetEnabled(m_ParticleSystem);
				}
				set
				{
					SetEnabled(m_ParticleSystem, value);
				}
			}

			public MinMaxGradient color
			{
				get
				{
					MinMaxGradient gradient = default(MinMaxGradient);
					GetColor(m_ParticleSystem, ref gradient);
					return gradient;
				}
				set
				{
					SetColor(m_ParticleSystem, ref value);
				}
			}

			public Vector2 range
			{
				get
				{
					return GetRange(m_ParticleSystem);
				}
				set
				{
					SetRange(m_ParticleSystem, value);
				}
			}

			internal ColorBySpeedModule(ParticleSystem particleSystem)
			{
				m_ParticleSystem = particleSystem;
			}

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetEnabled(ParticleSystem system, bool value);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern bool GetEnabled(ParticleSystem system);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetColor(ParticleSystem system, ref MinMaxGradient gradient);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void GetColor(ParticleSystem system, ref MinMaxGradient gradient);

			private static void SetRange(ParticleSystem system, Vector2 value)
			{
				INTERNAL_CALL_SetRange(system, ref value);
			}

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void INTERNAL_CALL_SetRange(ParticleSystem system, ref Vector2 value);

			private static Vector2 GetRange(ParticleSystem system)
			{
				Vector2 value;
				INTERNAL_CALL_GetRange(system, out value);
				return value;
			}

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void INTERNAL_CALL_GetRange(ParticleSystem system, out Vector2 value);
		}

		public struct SizeOverLifetimeModule
		{
			private ParticleSystem m_ParticleSystem;

			public bool enabled
			{
				get
				{
					return GetEnabled(m_ParticleSystem);
				}
				set
				{
					SetEnabled(m_ParticleSystem, value);
				}
			}

			public MinMaxCurve size
			{
				get
				{
					MinMaxCurve curve = default(MinMaxCurve);
					GetX(m_ParticleSystem, ref curve);
					return curve;
				}
				set
				{
					SetX(m_ParticleSystem, ref value);
				}
			}

			public MinMaxCurve x
			{
				get
				{
					MinMaxCurve curve = default(MinMaxCurve);
					GetX(m_ParticleSystem, ref curve);
					return curve;
				}
				set
				{
					SetX(m_ParticleSystem, ref value);
				}
			}

			public MinMaxCurve y
			{
				get
				{
					MinMaxCurve curve = default(MinMaxCurve);
					GetY(m_ParticleSystem, ref curve);
					return curve;
				}
				set
				{
					SetY(m_ParticleSystem, ref value);
				}
			}

			public MinMaxCurve z
			{
				get
				{
					MinMaxCurve curve = default(MinMaxCurve);
					GetZ(m_ParticleSystem, ref curve);
					return curve;
				}
				set
				{
					SetZ(m_ParticleSystem, ref value);
				}
			}

			public bool separateAxes
			{
				get
				{
					return GetSeparateAxes(m_ParticleSystem);
				}
				set
				{
					SetSeparateAxes(m_ParticleSystem, value);
				}
			}

			internal SizeOverLifetimeModule(ParticleSystem particleSystem)
			{
				m_ParticleSystem = particleSystem;
			}

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetEnabled(ParticleSystem system, bool value);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern bool GetEnabled(ParticleSystem system);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetX(ParticleSystem system, ref MinMaxCurve curve);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void GetX(ParticleSystem system, ref MinMaxCurve curve);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetY(ParticleSystem system, ref MinMaxCurve curve);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void GetY(ParticleSystem system, ref MinMaxCurve curve);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetZ(ParticleSystem system, ref MinMaxCurve curve);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void GetZ(ParticleSystem system, ref MinMaxCurve curve);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetSeparateAxes(ParticleSystem system, bool value);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern bool GetSeparateAxes(ParticleSystem system);
		}

		public struct SizeBySpeedModule
		{
			private ParticleSystem m_ParticleSystem;

			public bool enabled
			{
				get
				{
					return GetEnabled(m_ParticleSystem);
				}
				set
				{
					SetEnabled(m_ParticleSystem, value);
				}
			}

			public MinMaxCurve size
			{
				get
				{
					MinMaxCurve curve = default(MinMaxCurve);
					GetX(m_ParticleSystem, ref curve);
					return curve;
				}
				set
				{
					SetX(m_ParticleSystem, ref value);
				}
			}

			public MinMaxCurve x
			{
				get
				{
					MinMaxCurve curve = default(MinMaxCurve);
					GetX(m_ParticleSystem, ref curve);
					return curve;
				}
				set
				{
					SetX(m_ParticleSystem, ref value);
				}
			}

			public MinMaxCurve y
			{
				get
				{
					MinMaxCurve curve = default(MinMaxCurve);
					GetY(m_ParticleSystem, ref curve);
					return curve;
				}
				set
				{
					SetY(m_ParticleSystem, ref value);
				}
			}

			public MinMaxCurve z
			{
				get
				{
					MinMaxCurve curve = default(MinMaxCurve);
					GetZ(m_ParticleSystem, ref curve);
					return curve;
				}
				set
				{
					SetZ(m_ParticleSystem, ref value);
				}
			}

			public bool separateAxes
			{
				get
				{
					return GetSeparateAxes(m_ParticleSystem);
				}
				set
				{
					SetSeparateAxes(m_ParticleSystem, value);
				}
			}

			public Vector2 range
			{
				get
				{
					return GetRange(m_ParticleSystem);
				}
				set
				{
					SetRange(m_ParticleSystem, value);
				}
			}

			internal SizeBySpeedModule(ParticleSystem particleSystem)
			{
				m_ParticleSystem = particleSystem;
			}

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetEnabled(ParticleSystem system, bool value);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern bool GetEnabled(ParticleSystem system);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetX(ParticleSystem system, ref MinMaxCurve curve);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void GetX(ParticleSystem system, ref MinMaxCurve curve);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetY(ParticleSystem system, ref MinMaxCurve curve);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void GetY(ParticleSystem system, ref MinMaxCurve curve);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetZ(ParticleSystem system, ref MinMaxCurve curve);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void GetZ(ParticleSystem system, ref MinMaxCurve curve);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetSeparateAxes(ParticleSystem system, bool value);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern bool GetSeparateAxes(ParticleSystem system);

			private static void SetRange(ParticleSystem system, Vector2 value)
			{
				INTERNAL_CALL_SetRange(system, ref value);
			}

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void INTERNAL_CALL_SetRange(ParticleSystem system, ref Vector2 value);

			private static Vector2 GetRange(ParticleSystem system)
			{
				Vector2 value;
				INTERNAL_CALL_GetRange(system, out value);
				return value;
			}

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void INTERNAL_CALL_GetRange(ParticleSystem system, out Vector2 value);
		}

		public struct RotationOverLifetimeModule
		{
			private ParticleSystem m_ParticleSystem;

			public bool enabled
			{
				get
				{
					return GetEnabled(m_ParticleSystem);
				}
				set
				{
					SetEnabled(m_ParticleSystem, value);
				}
			}

			public MinMaxCurve x
			{
				get
				{
					MinMaxCurve curve = default(MinMaxCurve);
					GetX(m_ParticleSystem, ref curve);
					return curve;
				}
				set
				{
					SetX(m_ParticleSystem, ref value);
				}
			}

			public MinMaxCurve y
			{
				get
				{
					MinMaxCurve curve = default(MinMaxCurve);
					GetY(m_ParticleSystem, ref curve);
					return curve;
				}
				set
				{
					SetY(m_ParticleSystem, ref value);
				}
			}

			public MinMaxCurve z
			{
				get
				{
					MinMaxCurve curve = default(MinMaxCurve);
					GetZ(m_ParticleSystem, ref curve);
					return curve;
				}
				set
				{
					SetZ(m_ParticleSystem, ref value);
				}
			}

			public bool separateAxes
			{
				get
				{
					return GetSeparateAxes(m_ParticleSystem);
				}
				set
				{
					SetSeparateAxes(m_ParticleSystem, value);
				}
			}

			internal RotationOverLifetimeModule(ParticleSystem particleSystem)
			{
				m_ParticleSystem = particleSystem;
			}

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetEnabled(ParticleSystem system, bool value);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern bool GetEnabled(ParticleSystem system);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetX(ParticleSystem system, ref MinMaxCurve curve);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void GetX(ParticleSystem system, ref MinMaxCurve curve);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetY(ParticleSystem system, ref MinMaxCurve curve);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void GetY(ParticleSystem system, ref MinMaxCurve curve);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetZ(ParticleSystem system, ref MinMaxCurve curve);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void GetZ(ParticleSystem system, ref MinMaxCurve curve);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetSeparateAxes(ParticleSystem system, bool value);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern bool GetSeparateAxes(ParticleSystem system);
		}

		public struct RotationBySpeedModule
		{
			private ParticleSystem m_ParticleSystem;

			public bool enabled
			{
				get
				{
					return GetEnabled(m_ParticleSystem);
				}
				set
				{
					SetEnabled(m_ParticleSystem, value);
				}
			}

			public MinMaxCurve x
			{
				get
				{
					MinMaxCurve curve = default(MinMaxCurve);
					GetX(m_ParticleSystem, ref curve);
					return curve;
				}
				set
				{
					SetX(m_ParticleSystem, ref value);
				}
			}

			public MinMaxCurve y
			{
				get
				{
					MinMaxCurve curve = default(MinMaxCurve);
					GetY(m_ParticleSystem, ref curve);
					return curve;
				}
				set
				{
					SetY(m_ParticleSystem, ref value);
				}
			}

			public MinMaxCurve z
			{
				get
				{
					MinMaxCurve curve = default(MinMaxCurve);
					GetZ(m_ParticleSystem, ref curve);
					return curve;
				}
				set
				{
					SetZ(m_ParticleSystem, ref value);
				}
			}

			public bool separateAxes
			{
				get
				{
					return GetSeparateAxes(m_ParticleSystem);
				}
				set
				{
					SetSeparateAxes(m_ParticleSystem, value);
				}
			}

			public Vector2 range
			{
				get
				{
					return GetRange(m_ParticleSystem);
				}
				set
				{
					SetRange(m_ParticleSystem, value);
				}
			}

			internal RotationBySpeedModule(ParticleSystem particleSystem)
			{
				m_ParticleSystem = particleSystem;
			}

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetEnabled(ParticleSystem system, bool value);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern bool GetEnabled(ParticleSystem system);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetX(ParticleSystem system, ref MinMaxCurve curve);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void GetX(ParticleSystem system, ref MinMaxCurve curve);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetY(ParticleSystem system, ref MinMaxCurve curve);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void GetY(ParticleSystem system, ref MinMaxCurve curve);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetZ(ParticleSystem system, ref MinMaxCurve curve);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void GetZ(ParticleSystem system, ref MinMaxCurve curve);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetSeparateAxes(ParticleSystem system, bool value);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern bool GetSeparateAxes(ParticleSystem system);

			private static void SetRange(ParticleSystem system, Vector2 value)
			{
				INTERNAL_CALL_SetRange(system, ref value);
			}

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void INTERNAL_CALL_SetRange(ParticleSystem system, ref Vector2 value);

			private static Vector2 GetRange(ParticleSystem system)
			{
				Vector2 value;
				INTERNAL_CALL_GetRange(system, out value);
				return value;
			}

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void INTERNAL_CALL_GetRange(ParticleSystem system, out Vector2 value);
		}

		public struct ExternalForcesModule
		{
			private ParticleSystem m_ParticleSystem;

			public bool enabled
			{
				get
				{
					return GetEnabled(m_ParticleSystem);
				}
				set
				{
					SetEnabled(m_ParticleSystem, value);
				}
			}

			public float multiplier
			{
				get
				{
					return GetMultiplier(m_ParticleSystem);
				}
				set
				{
					SetMultiplier(m_ParticleSystem, value);
				}
			}

			internal ExternalForcesModule(ParticleSystem particleSystem)
			{
				m_ParticleSystem = particleSystem;
			}

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetEnabled(ParticleSystem system, bool value);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern bool GetEnabled(ParticleSystem system);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetMultiplier(ParticleSystem system, float value);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern float GetMultiplier(ParticleSystem system);
		}

		public struct CollisionModule
		{
			private ParticleSystem m_ParticleSystem;

			public bool enabled
			{
				get
				{
					return GetEnabled(m_ParticleSystem);
				}
				set
				{
					SetEnabled(m_ParticleSystem, value);
				}
			}

			public ParticleSystemCollisionType type
			{
				get
				{
					return (ParticleSystemCollisionType)GetType(m_ParticleSystem);
				}
				set
				{
					SetType(m_ParticleSystem, (int)value);
				}
			}

			public ParticleSystemCollisionMode mode
			{
				get
				{
					return (ParticleSystemCollisionMode)GetMode(m_ParticleSystem);
				}
				set
				{
					SetMode(m_ParticleSystem, (int)value);
				}
			}

			public MinMaxCurve dampen
			{
				get
				{
					MinMaxCurve curve = default(MinMaxCurve);
					GetDampen(m_ParticleSystem, ref curve);
					return curve;
				}
				set
				{
					SetDampen(m_ParticleSystem, ref value);
				}
			}

			public MinMaxCurve bounce
			{
				get
				{
					MinMaxCurve curve = default(MinMaxCurve);
					GetBounce(m_ParticleSystem, ref curve);
					return curve;
				}
				set
				{
					SetBounce(m_ParticleSystem, ref value);
				}
			}

			public MinMaxCurve lifetimeLoss
			{
				get
				{
					MinMaxCurve curve = default(MinMaxCurve);
					GetEnergyLoss(m_ParticleSystem, ref curve);
					return curve;
				}
				set
				{
					SetEnergyLoss(m_ParticleSystem, ref value);
				}
			}

			public float minKillSpeed
			{
				get
				{
					return GetMinKillSpeed(m_ParticleSystem);
				}
				set
				{
					SetMinKillSpeed(m_ParticleSystem, value);
				}
			}

			public float maxKillSpeed
			{
				get
				{
					return GetMaxKillSpeed(m_ParticleSystem);
				}
				set
				{
					SetMaxKillSpeed(m_ParticleSystem, value);
				}
			}

			public LayerMask collidesWith
			{
				get
				{
					return GetCollidesWith(m_ParticleSystem);
				}
				set
				{
					SetCollidesWith(m_ParticleSystem, value);
				}
			}

			public bool enableDynamicColliders
			{
				get
				{
					return GetEnableDynamicColliders(m_ParticleSystem);
				}
				set
				{
					SetEnableDynamicColliders(m_ParticleSystem, value);
				}
			}

			public bool enableInteriorCollisions
			{
				get
				{
					return GetEnableInteriorCollisions(m_ParticleSystem);
				}
				set
				{
					SetEnableInteriorCollisions(m_ParticleSystem, value);
				}
			}

			public int maxCollisionShapes
			{
				get
				{
					return GetMaxCollisionShapes(m_ParticleSystem);
				}
				set
				{
					SetMaxCollisionShapes(m_ParticleSystem, value);
				}
			}

			public ParticleSystemCollisionQuality quality
			{
				get
				{
					return (ParticleSystemCollisionQuality)GetQuality(m_ParticleSystem);
				}
				set
				{
					SetQuality(m_ParticleSystem, (int)value);
				}
			}

			public float voxelSize
			{
				get
				{
					return GetVoxelSize(m_ParticleSystem);
				}
				set
				{
					SetVoxelSize(m_ParticleSystem, value);
				}
			}

			public float radiusScale
			{
				get
				{
					return GetRadiusScale(m_ParticleSystem);
				}
				set
				{
					SetRadiusScale(m_ParticleSystem, value);
				}
			}

			public bool sendCollisionMessages
			{
				get
				{
					return GetUsesCollisionMessages(m_ParticleSystem);
				}
				set
				{
					SetUsesCollisionMessages(m_ParticleSystem, value);
				}
			}

			public int maxPlaneCount
			{
				get
				{
					return GetMaxPlaneCount(m_ParticleSystem);
				}
			}

			internal CollisionModule(ParticleSystem particleSystem)
			{
				m_ParticleSystem = particleSystem;
			}

			public void SetPlane(int index, Transform transform)
			{
				SetPlane(m_ParticleSystem, index, transform);
			}

			public Transform GetPlane(int index)
			{
				return GetPlane(m_ParticleSystem, index);
			}

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetEnabled(ParticleSystem system, bool value);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern bool GetEnabled(ParticleSystem system);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetType(ParticleSystem system, int value);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern int GetType(ParticleSystem system);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetMode(ParticleSystem system, int value);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern int GetMode(ParticleSystem system);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetDampen(ParticleSystem system, ref MinMaxCurve curve);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void GetDampen(ParticleSystem system, ref MinMaxCurve curve);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetBounce(ParticleSystem system, ref MinMaxCurve curve);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void GetBounce(ParticleSystem system, ref MinMaxCurve curve);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetEnergyLoss(ParticleSystem system, ref MinMaxCurve curve);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void GetEnergyLoss(ParticleSystem system, ref MinMaxCurve curve);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetMinKillSpeed(ParticleSystem system, float value);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern float GetMinKillSpeed(ParticleSystem system);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetMaxKillSpeed(ParticleSystem system, float value);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern float GetMaxKillSpeed(ParticleSystem system);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetCollidesWith(ParticleSystem system, int value);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern int GetCollidesWith(ParticleSystem system);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetEnableDynamicColliders(ParticleSystem system, bool value);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern bool GetEnableDynamicColliders(ParticleSystem system);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetEnableInteriorCollisions(ParticleSystem system, bool value);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern bool GetEnableInteriorCollisions(ParticleSystem system);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetMaxCollisionShapes(ParticleSystem system, int value);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern int GetMaxCollisionShapes(ParticleSystem system);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetQuality(ParticleSystem system, int value);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern int GetQuality(ParticleSystem system);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetVoxelSize(ParticleSystem system, float value);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern float GetVoxelSize(ParticleSystem system);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetRadiusScale(ParticleSystem system, float value);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern float GetRadiusScale(ParticleSystem system);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetUsesCollisionMessages(ParticleSystem system, bool value);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern bool GetUsesCollisionMessages(ParticleSystem system);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetPlane(ParticleSystem system, int index, Transform transform);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern Transform GetPlane(ParticleSystem system, int index);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern int GetMaxPlaneCount(ParticleSystem system);
		}

		public struct TriggerModule
		{
			private ParticleSystem m_ParticleSystem;

			public bool enabled
			{
				get
				{
					return GetEnabled(m_ParticleSystem);
				}
				set
				{
					SetEnabled(m_ParticleSystem, value);
				}
			}

			public ParticleSystemOverlapAction inside
			{
				get
				{
					return (ParticleSystemOverlapAction)GetInside(m_ParticleSystem);
				}
				set
				{
					SetInside(m_ParticleSystem, (int)value);
				}
			}

			public ParticleSystemOverlapAction outside
			{
				get
				{
					return (ParticleSystemOverlapAction)GetOutside(m_ParticleSystem);
				}
				set
				{
					SetOutside(m_ParticleSystem, (int)value);
				}
			}

			public ParticleSystemOverlapAction enter
			{
				get
				{
					return (ParticleSystemOverlapAction)GetEnter(m_ParticleSystem);
				}
				set
				{
					SetEnter(m_ParticleSystem, (int)value);
				}
			}

			public ParticleSystemOverlapAction exit
			{
				get
				{
					return (ParticleSystemOverlapAction)GetExit(m_ParticleSystem);
				}
				set
				{
					SetExit(m_ParticleSystem, (int)value);
				}
			}

			public float radiusScale
			{
				get
				{
					return GetRadiusScale(m_ParticleSystem);
				}
				set
				{
					SetRadiusScale(m_ParticleSystem, value);
				}
			}

			public int maxColliderCount
			{
				get
				{
					return GetMaxColliderCount(m_ParticleSystem);
				}
			}

			internal TriggerModule(ParticleSystem particleSystem)
			{
				m_ParticleSystem = particleSystem;
			}

			public void SetCollider(int index, Component collider)
			{
				SetCollider(m_ParticleSystem, index, collider);
			}

			public Component GetCollider(int index)
			{
				return GetCollider(m_ParticleSystem, index);
			}

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetEnabled(ParticleSystem system, bool value);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern bool GetEnabled(ParticleSystem system);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetInside(ParticleSystem system, int value);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern int GetInside(ParticleSystem system);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetOutside(ParticleSystem system, int value);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern int GetOutside(ParticleSystem system);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetEnter(ParticleSystem system, int value);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern int GetEnter(ParticleSystem system);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetExit(ParticleSystem system, int value);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern int GetExit(ParticleSystem system);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetRadiusScale(ParticleSystem system, float value);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern float GetRadiusScale(ParticleSystem system);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetCollider(ParticleSystem system, int index, Component collider);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern Component GetCollider(ParticleSystem system, int index);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern int GetMaxColliderCount(ParticleSystem system);
		}

		public struct SubEmittersModule
		{
			private ParticleSystem m_ParticleSystem;

			public bool enabled
			{
				get
				{
					return GetEnabled(m_ParticleSystem);
				}
				set
				{
					SetEnabled(m_ParticleSystem, value);
				}
			}

			public ParticleSystem birth0
			{
				get
				{
					return GetBirth(m_ParticleSystem, 0);
				}
				set
				{
					SetBirth(m_ParticleSystem, 0, value);
				}
			}

			public ParticleSystem birth1
			{
				get
				{
					return GetBirth(m_ParticleSystem, 1);
				}
				set
				{
					SetBirth(m_ParticleSystem, 1, value);
				}
			}

			public ParticleSystem collision0
			{
				get
				{
					return GetCollision(m_ParticleSystem, 0);
				}
				set
				{
					SetCollision(m_ParticleSystem, 0, value);
				}
			}

			public ParticleSystem collision1
			{
				get
				{
					return GetCollision(m_ParticleSystem, 1);
				}
				set
				{
					SetCollision(m_ParticleSystem, 1, value);
				}
			}

			public ParticleSystem death0
			{
				get
				{
					return GetDeath(m_ParticleSystem, 0);
				}
				set
				{
					SetDeath(m_ParticleSystem, 0, value);
				}
			}

			public ParticleSystem death1
			{
				get
				{
					return GetDeath(m_ParticleSystem, 1);
				}
				set
				{
					SetDeath(m_ParticleSystem, 1, value);
				}
			}

			internal SubEmittersModule(ParticleSystem particleSystem)
			{
				m_ParticleSystem = particleSystem;
			}

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetEnabled(ParticleSystem system, bool value);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern bool GetEnabled(ParticleSystem system);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetBirth(ParticleSystem system, int index, ParticleSystem value);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern ParticleSystem GetBirth(ParticleSystem system, int index);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetCollision(ParticleSystem system, int index, ParticleSystem value);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern ParticleSystem GetCollision(ParticleSystem system, int index);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetDeath(ParticleSystem system, int index, ParticleSystem value);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern ParticleSystem GetDeath(ParticleSystem system, int index);
		}

		public struct TextureSheetAnimationModule
		{
			private ParticleSystem m_ParticleSystem;

			public bool enabled
			{
				get
				{
					return GetEnabled(m_ParticleSystem);
				}
				set
				{
					SetEnabled(m_ParticleSystem, value);
				}
			}

			public int numTilesX
			{
				get
				{
					return GetNumTilesX(m_ParticleSystem);
				}
				set
				{
					SetNumTilesX(m_ParticleSystem, value);
				}
			}

			public int numTilesY
			{
				get
				{
					return GetNumTilesY(m_ParticleSystem);
				}
				set
				{
					SetNumTilesY(m_ParticleSystem, value);
				}
			}

			public ParticleSystemAnimationType animation
			{
				get
				{
					return (ParticleSystemAnimationType)GetAnimationType(m_ParticleSystem);
				}
				set
				{
					SetAnimationType(m_ParticleSystem, (int)value);
				}
			}

			public bool useRandomRow
			{
				get
				{
					return GetUseRandomRow(m_ParticleSystem);
				}
				set
				{
					SetUseRandomRow(m_ParticleSystem, value);
				}
			}

			public MinMaxCurve frameOverTime
			{
				get
				{
					MinMaxCurve curve = default(MinMaxCurve);
					GetFrameOverTime(m_ParticleSystem, ref curve);
					return curve;
				}
				set
				{
					SetFrameOverTime(m_ParticleSystem, ref value);
				}
			}

			public MinMaxCurve startFrame
			{
				get
				{
					MinMaxCurve curve = default(MinMaxCurve);
					GetStartFrame(m_ParticleSystem, ref curve);
					return curve;
				}
				set
				{
					SetStartFrame(m_ParticleSystem, ref value);
				}
			}

			public int cycleCount
			{
				get
				{
					return GetCycleCount(m_ParticleSystem);
				}
				set
				{
					SetCycleCount(m_ParticleSystem, value);
				}
			}

			public int rowIndex
			{
				get
				{
					return GetRowIndex(m_ParticleSystem);
				}
				set
				{
					SetRowIndex(m_ParticleSystem, value);
				}
			}

			public UVChannelFlags uvChannelMask
			{
				get
				{
					return (UVChannelFlags)GetUVChannelMask(m_ParticleSystem);
				}
				set
				{
					SetUVChannelMask(m_ParticleSystem, (int)value);
				}
			}

			internal TextureSheetAnimationModule(ParticleSystem particleSystem)
			{
				m_ParticleSystem = particleSystem;
			}

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetEnabled(ParticleSystem system, bool value);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern bool GetEnabled(ParticleSystem system);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetNumTilesX(ParticleSystem system, int value);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern int GetNumTilesX(ParticleSystem system);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetNumTilesY(ParticleSystem system, int value);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern int GetNumTilesY(ParticleSystem system);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetAnimationType(ParticleSystem system, int value);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern int GetAnimationType(ParticleSystem system);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetUseRandomRow(ParticleSystem system, bool value);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern bool GetUseRandomRow(ParticleSystem system);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetFrameOverTime(ParticleSystem system, ref MinMaxCurve curve);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void GetFrameOverTime(ParticleSystem system, ref MinMaxCurve curve);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetStartFrame(ParticleSystem system, ref MinMaxCurve curve);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void GetStartFrame(ParticleSystem system, ref MinMaxCurve curve);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetCycleCount(ParticleSystem system, int value);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern int GetCycleCount(ParticleSystem system);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetRowIndex(ParticleSystem system, int value);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern int GetRowIndex(ParticleSystem system);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void SetUVChannelMask(ParticleSystem system, int value);

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern int GetUVChannelMask(ParticleSystem system);
		}

		[RequiredByNativeCode("particleSystemParticle", Optional = true)]
		public struct Particle
		{
			private Vector3 m_Position;

			private Vector3 m_Velocity;

			private Vector3 m_AnimatedVelocity;

			private Vector3 m_InitialVelocity;

			private Vector3 m_AxisOfRotation;

			private Vector3 m_Rotation;

			private Vector3 m_AngularVelocity;

			private Vector3 m_StartSize;

			private Color32 m_StartColor;

			private uint m_RandomSeed;

			private float m_Lifetime;

			private float m_StartLifetime;

			private float m_EmitAccumulator0;

			private float m_EmitAccumulator1;

			public Vector3 position
			{
				get
				{
					return m_Position;
				}
				set
				{
					m_Position = value;
				}
			}

			public Vector3 velocity
			{
				get
				{
					return m_Velocity;
				}
				set
				{
					m_Velocity = value;
				}
			}

			public float lifetime
			{
				get
				{
					return m_Lifetime;
				}
				set
				{
					m_Lifetime = value;
				}
			}

			public float startLifetime
			{
				get
				{
					return m_StartLifetime;
				}
				set
				{
					m_StartLifetime = value;
				}
			}

			public float startSize
			{
				get
				{
					return m_StartSize.x;
				}
				set
				{
					m_StartSize = new Vector3(value, value, value);
				}
			}

			public Vector3 startSize3D
			{
				get
				{
					return m_StartSize;
				}
				set
				{
					m_StartSize = value;
				}
			}

			public Vector3 axisOfRotation
			{
				get
				{
					return m_AxisOfRotation;
				}
				set
				{
					m_AxisOfRotation = value;
				}
			}

			public float rotation
			{
				get
				{
					return m_Rotation.z * 57.29578f;
				}
				set
				{
					m_Rotation = new Vector3(0f, 0f, value * ((float)Math.PI / 180f));
				}
			}

			public Vector3 rotation3D
			{
				get
				{
					return m_Rotation * 57.29578f;
				}
				set
				{
					m_Rotation = value * ((float)Math.PI / 180f);
				}
			}

			public float angularVelocity
			{
				get
				{
					return m_AngularVelocity.z * 57.29578f;
				}
				set
				{
					m_AngularVelocity.z = value * ((float)Math.PI / 180f);
				}
			}

			public Vector3 angularVelocity3D
			{
				get
				{
					return m_AngularVelocity * 57.29578f;
				}
				set
				{
					m_AngularVelocity = value * ((float)Math.PI / 180f);
				}
			}

			public Color32 startColor
			{
				get
				{
					return m_StartColor;
				}
				set
				{
					m_StartColor = value;
				}
			}

			[Obsolete("randomValue property is deprecated. Use randomSeed instead to control random behavior of particles.")]
			public float randomValue
			{
				get
				{
					return BitConverter.ToSingle(BitConverter.GetBytes(m_RandomSeed), 0);
				}
				set
				{
					m_RandomSeed = BitConverter.ToUInt32(BitConverter.GetBytes(value), 0);
				}
			}

			public uint randomSeed
			{
				get
				{
					return m_RandomSeed;
				}
				set
				{
					m_RandomSeed = value;
				}
			}

			[Obsolete("size property is deprecated. Use startSize or GetCurrentSize() instead.")]
			public float size
			{
				get
				{
					return m_StartSize.x;
				}
				set
				{
					m_StartSize = new Vector3(value, value, value);
				}
			}

			[Obsolete("color property is deprecated. Use startColor or GetCurrentColor() instead.")]
			public Color32 color
			{
				get
				{
					return m_StartColor;
				}
				set
				{
					m_StartColor = value;
				}
			}

			public float GetCurrentSize(ParticleSystem system)
			{
				return GetCurrentSize(system, ref this);
			}

			public Vector3 GetCurrentSize3D(ParticleSystem system)
			{
				return GetCurrentSize3D(system, ref this);
			}

			public Color32 GetCurrentColor(ParticleSystem system)
			{
				return GetCurrentColor(system, ref this);
			}

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern float GetCurrentSize(ParticleSystem system, ref Particle particle);

			private static Vector3 GetCurrentSize3D(ParticleSystem system, ref Particle particle)
			{
				Vector3 value;
				INTERNAL_CALL_GetCurrentSize3D(system, ref particle, out value);
				return value;
			}

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void INTERNAL_CALL_GetCurrentSize3D(ParticleSystem system, ref Particle particle, out Vector3 value);

			private static Color32 GetCurrentColor(ParticleSystem system, ref Particle particle)
			{
				Color32 value;
				INTERNAL_CALL_GetCurrentColor(system, ref particle, out value);
				return value;
			}

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void INTERNAL_CALL_GetCurrentColor(ParticleSystem system, ref Particle particle, out Color32 value);
		}

		public struct EmitParams
		{
			internal Particle m_Particle;

			internal bool m_PositionSet;

			internal bool m_VelocitySet;

			internal bool m_AxisOfRotationSet;

			internal bool m_RotationSet;

			internal bool m_AngularVelocitySet;

			internal bool m_StartSizeSet;

			internal bool m_StartColorSet;

			internal bool m_RandomSeedSet;

			internal bool m_StartLifetimeSet;

			internal bool m_ApplyShapeToPosition;

			public Vector3 position
			{
				get
				{
					return m_Particle.position;
				}
				set
				{
					m_Particle.position = value;
					m_PositionSet = true;
				}
			}

			public bool applyShapeToPosition
			{
				get
				{
					return m_ApplyShapeToPosition;
				}
				set
				{
					m_ApplyShapeToPosition = value;
				}
			}

			public Vector3 velocity
			{
				get
				{
					return m_Particle.velocity;
				}
				set
				{
					m_Particle.velocity = value;
					m_VelocitySet = true;
				}
			}

			public float startLifetime
			{
				get
				{
					return m_Particle.startLifetime;
				}
				set
				{
					m_Particle.startLifetime = value;
					m_StartLifetimeSet = true;
				}
			}

			public float startSize
			{
				get
				{
					return m_Particle.startSize;
				}
				set
				{
					m_Particle.startSize = value;
					m_StartSizeSet = true;
				}
			}

			public Vector3 startSize3D
			{
				get
				{
					return m_Particle.startSize3D;
				}
				set
				{
					m_Particle.startSize3D = value;
					m_StartSizeSet = true;
				}
			}

			public Vector3 axisOfRotation
			{
				get
				{
					return m_Particle.axisOfRotation;
				}
				set
				{
					m_Particle.axisOfRotation = value;
					m_AxisOfRotationSet = true;
				}
			}

			public float rotation
			{
				get
				{
					return m_Particle.rotation;
				}
				set
				{
					m_Particle.rotation = value;
					m_RotationSet = true;
				}
			}

			public Vector3 rotation3D
			{
				get
				{
					return m_Particle.rotation3D;
				}
				set
				{
					m_Particle.rotation3D = value;
					m_RotationSet = true;
				}
			}

			public float angularVelocity
			{
				get
				{
					return m_Particle.angularVelocity;
				}
				set
				{
					m_Particle.angularVelocity = value;
					m_AngularVelocitySet = true;
				}
			}

			public Vector3 angularVelocity3D
			{
				get
				{
					return m_Particle.angularVelocity3D;
				}
				set
				{
					m_Particle.angularVelocity3D = value;
					m_AngularVelocitySet = true;
				}
			}

			public Color32 startColor
			{
				get
				{
					return m_Particle.startColor;
				}
				set
				{
					m_Particle.startColor = value;
					m_StartColorSet = true;
				}
			}

			public uint randomSeed
			{
				get
				{
					return m_Particle.randomSeed;
				}
				set
				{
					m_Particle.randomSeed = value;
					m_RandomSeedSet = true;
				}
			}

			public void ResetPosition()
			{
				m_PositionSet = false;
			}

			public void ResetVelocity()
			{
				m_VelocitySet = false;
			}

			public void ResetAxisOfRotation()
			{
				m_AxisOfRotationSet = false;
			}

			public void ResetRotation()
			{
				m_RotationSet = false;
			}

			public void ResetAngularVelocity()
			{
				m_AngularVelocitySet = false;
			}

			public void ResetStartSize()
			{
				m_StartSizeSet = false;
			}

			public void ResetStartColor()
			{
				m_StartColorSet = false;
			}

			public void ResetRandomSeed()
			{
				m_RandomSeedSet = false;
			}

			public void ResetStartLifetime()
			{
				m_StartLifetimeSet = false;
			}
		}

		internal delegate bool IteratorDelegate(ParticleSystem ps);

		public extern float startDelay
		{
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			get;
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			set;
		}

		public extern bool isPlaying
		{
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			get;
		}

		public extern bool isStopped
		{
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			get;
		}

		public extern bool isPaused
		{
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			get;
		}

		public extern bool loop
		{
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			get;
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			set;
		}

		public extern bool playOnAwake
		{
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			get;
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			set;
		}

		public extern float time
		{
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			get;
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			set;
		}

		public extern float duration
		{
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			get;
		}

		public extern float playbackSpeed
		{
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			get;
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			set;
		}

		public extern int particleCount
		{
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			get;
		}

		[Obsolete("enableEmission property is deprecated. Use emission.enabled instead.")]
		public extern bool enableEmission
		{
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			get;
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			set;
		}

		[Obsolete("emissionRate property is deprecated. Use emission.rate instead.")]
		public extern float emissionRate
		{
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			get;
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			set;
		}

		public extern float startSpeed
		{
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			get;
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			set;
		}

		public extern float startSize
		{
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			get;
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			set;
		}

		public Color startColor
		{
			get
			{
				Color value;
				INTERNAL_get_startColor(out value);
				return value;
			}
			set
			{
				INTERNAL_set_startColor(ref value);
			}
		}

		public extern float startRotation
		{
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			get;
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			set;
		}

		public Vector3 startRotation3D
		{
			get
			{
				Vector3 value;
				INTERNAL_get_startRotation3D(out value);
				return value;
			}
			set
			{
				INTERNAL_set_startRotation3D(ref value);
			}
		}

		public extern float startLifetime
		{
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			get;
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			set;
		}

		public extern float gravityModifier
		{
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			get;
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			set;
		}

		public extern int maxParticles
		{
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			get;
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			set;
		}

		public extern ParticleSystemSimulationSpace simulationSpace
		{
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			get;
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			set;
		}

		public extern ParticleSystemScalingMode scalingMode
		{
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			get;
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			set;
		}

		public extern uint randomSeed
		{
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			get;
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			set;
		}

		public extern bool useAutoRandomSeed
		{
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			get;
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			set;
		}

		public EmissionModule emission
		{
			get
			{
				return new EmissionModule(this);
			}
		}

		public ShapeModule shape
		{
			get
			{
				return new ShapeModule(this);
			}
		}

		public VelocityOverLifetimeModule velocityOverLifetime
		{
			get
			{
				return new VelocityOverLifetimeModule(this);
			}
		}

		public LimitVelocityOverLifetimeModule limitVelocityOverLifetime
		{
			get
			{
				return new LimitVelocityOverLifetimeModule(this);
			}
		}

		public InheritVelocityModule inheritVelocity
		{
			get
			{
				return new InheritVelocityModule(this);
			}
		}

		public ForceOverLifetimeModule forceOverLifetime
		{
			get
			{
				return new ForceOverLifetimeModule(this);
			}
		}

		public ColorOverLifetimeModule colorOverLifetime
		{
			get
			{
				return new ColorOverLifetimeModule(this);
			}
		}

		public ColorBySpeedModule colorBySpeed
		{
			get
			{
				return new ColorBySpeedModule(this);
			}
		}

		public SizeOverLifetimeModule sizeOverLifetime
		{
			get
			{
				return new SizeOverLifetimeModule(this);
			}
		}

		public SizeBySpeedModule sizeBySpeed
		{
			get
			{
				return new SizeBySpeedModule(this);
			}
		}

		public RotationOverLifetimeModule rotationOverLifetime
		{
			get
			{
				return new RotationOverLifetimeModule(this);
			}
		}

		public RotationBySpeedModule rotationBySpeed
		{
			get
			{
				return new RotationBySpeedModule(this);
			}
		}

		public ExternalForcesModule externalForces
		{
			get
			{
				return new ExternalForcesModule(this);
			}
		}

		public CollisionModule collision
		{
			get
			{
				return new CollisionModule(this);
			}
		}

		public TriggerModule trigger
		{
			get
			{
				return new TriggerModule(this);
			}
		}

		public SubEmittersModule subEmitters
		{
			get
			{
				return new SubEmittersModule(this);
			}
		}

		public TextureSheetAnimationModule textureSheetAnimation
		{
			get
			{
				return new TextureSheetAnimationModule(this);
			}
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private extern void INTERNAL_get_startColor(out Color value);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private extern void INTERNAL_set_startColor(ref Color value);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private extern void INTERNAL_get_startRotation3D(out Vector3 value);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private extern void INTERNAL_set_startRotation3D(ref Vector3 value);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public extern void SetParticles(Particle[] particles, int size);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public extern int GetParticles(Particle[] particles);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private static extern bool Internal_Simulate(ParticleSystem self, float t, bool restart, bool fixedTimeStep);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private static extern bool Internal_Play(ParticleSystem self);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private static extern bool Internal_Stop(ParticleSystem self);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private static extern bool Internal_Pause(ParticleSystem self);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private static extern bool Internal_Clear(ParticleSystem self);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private static extern bool Internal_IsAlive(ParticleSystem self);

		[ExcludeFromDocs]
		public void Simulate(float t, bool withChildren, bool restart)
		{
			bool fixedTimeStep = true;
			Simulate(t, withChildren, restart, fixedTimeStep);
		}

		[ExcludeFromDocs]
		public void Simulate(float t, bool withChildren)
		{
			bool fixedTimeStep = true;
			bool restart = true;
			Simulate(t, withChildren, restart, fixedTimeStep);
		}

		[ExcludeFromDocs]
		public void Simulate(float t)
		{
			bool fixedTimeStep = true;
			bool restart = true;
			bool withChildren = true;
			Simulate(t, withChildren, restart, fixedTimeStep);
		}

		public void Simulate(float t, [DefaultValue("true")] bool withChildren, [DefaultValue("true")] bool restart, [DefaultValue("true")] bool fixedTimeStep)
		{
			IterateParticleSystems(withChildren, (ParticleSystem ps) => Internal_Simulate(ps, t, restart, fixedTimeStep));
		}

		[ExcludeFromDocs]
		public void Play()
		{
			bool withChildren = true;
			Play(withChildren);
		}

		public void Play([DefaultValue("true")] bool withChildren)
		{
			IterateParticleSystems(withChildren, (ParticleSystem ps) => Internal_Play(ps));
		}

		[ExcludeFromDocs]
		public void Stop()
		{
			bool withChildren = true;
			Stop(withChildren);
		}

		public void Stop([DefaultValue("true")] bool withChildren)
		{
			IterateParticleSystems(withChildren, (ParticleSystem ps) => Internal_Stop(ps));
		}

		[ExcludeFromDocs]
		public void Pause()
		{
			bool withChildren = true;
			Pause(withChildren);
		}

		public void Pause([DefaultValue("true")] bool withChildren)
		{
			IterateParticleSystems(withChildren, (ParticleSystem ps) => Internal_Pause(ps));
		}

		[ExcludeFromDocs]
		public void Clear()
		{
			bool withChildren = true;
			Clear(withChildren);
		}

		public void Clear([DefaultValue("true")] bool withChildren)
		{
			IterateParticleSystems(withChildren, (ParticleSystem ps) => Internal_Clear(ps));
		}

		[ExcludeFromDocs]
		public bool IsAlive()
		{
			bool withChildren = true;
			return IsAlive(withChildren);
		}

		public bool IsAlive([DefaultValue("true")] bool withChildren)
		{
			return IterateParticleSystems(withChildren, (ParticleSystem ps) => Internal_IsAlive(ps));
		}

		public void Emit(int count)
		{
			INTERNAL_CALL_Emit(this, count);
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private static extern void INTERNAL_CALL_Emit(ParticleSystem self, int count);

		[Obsolete("Emit with specific parameters is deprecated. Pass a ParticleSystem.EmitParams parameter instead, which allows you to override some/all of the emission properties")]
		public void Emit(Vector3 position, Vector3 velocity, float size, float lifetime, Color32 color)
		{
			Particle particle = new Particle
			{
				position = position,
				velocity = velocity,
				lifetime = lifetime,
				startLifetime = lifetime,
				startSize = size,
				rotation3D = Vector3.zero,
				angularVelocity3D = Vector3.zero,
				startColor = color,
				randomSeed = 5u
			};
			Internal_EmitOld(ref particle);
		}

		[Obsolete("Emit with a single particle structure is deprecated. Pass a ParticleSystem.EmitParams parameter instead, which allows you to override some/all of the emission properties")]
		public void Emit(Particle particle)
		{
			Internal_EmitOld(ref particle);
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private extern void Internal_EmitOld(ref Particle particle);

		public void Emit(EmitParams emitParams, int count)
		{
			Internal_Emit(ref emitParams, count);
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private extern void Internal_Emit(ref EmitParams emitParams, int count);

		internal bool IterateParticleSystems(bool recurse, IteratorDelegate func)
		{
			bool flag = func(this);
			if (recurse)
			{
				flag |= IterateParticleSystemsRecursive(base.transform, func);
			}
			return flag;
		}

		private static bool IterateParticleSystemsRecursive(Transform transform, IteratorDelegate func)
		{
			bool flag = false;
			int childCount = transform.childCount;
			for (int i = 0; i < childCount; i++)
			{
				Transform child = transform.GetChild(i);
				ParticleSystem component = child.gameObject.GetComponent<ParticleSystem>();
				if (component != null)
				{
					flag = func(component);
					if (flag)
					{
						break;
					}
					IterateParticleSystemsRecursive(child, func);
				}
			}
			return flag;
		}
	}
}
