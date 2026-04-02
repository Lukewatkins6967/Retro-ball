using UnityEngine;

public class Constants : Singleton<Constants>
{
	public float m_passSpeed = 10f;

	public float m_aboveNetShootSpeed = 10f;

	public float m_ballThroughNetHeight = 2f;

	public float m_ballThroughNetMinDownSpeed = -1f;

	public Vector2 m_ballThroughNetRandomRange = Vector2.one;

	public AnimationCurve m_weaponThrowRangeAccuracyCurve;

	public AudioCue m_soundBounce;

	public AudioCue m_soundBackboard;

	public float m_weaponThrowTargetAngleRange = 90f;

	public float m_weaponThrowAngleDistFactor = 0.2f;

	public static Constants Data
	{
		get
		{
			return Singleton<Constants>.m_instance;
		}
	}

	private void Awake()
	{
		SetSingleton();
		Object.DontDestroyOnLoad(this);
	}
}
