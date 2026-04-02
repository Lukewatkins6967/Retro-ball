using UnityEngine;

public class FollowCamera : MonoBehaviour
{
	[SerializeField]
	private float m_lerpSpeed = 5f;

	[SerializeField]
	private float m_distance;

	[SerializeField]
	private Transform m_target;

	[SerializeField]
	private Vector3 m_targetOffset = new Vector3(0f, 0.85f, 0f);

	[SerializeField]
	private Vector3 m_deadZone = Vector3.zero;

	[SerializeField]
	private Vector3 m_boundsMin = -Vector3.one;

	[SerializeField]
	private Vector3 m_boundsMax = Vector3.one;

	private Shake m_shake;

	private Vector3 m_position = Vector3.zero;

	private Vector3 m_followPosition = Vector3.zero;

	public void SetTarget(Transform target)
	{
		m_target = target;
		UpdateFollowPosition(true);
	}

	private void Awake()
	{
		m_shake = GetComponent<Shake>();
		UpdateFollowPosition(true);
	}

	private void Update()
	{
		UpdateFollowPosition();
	}

	private void UpdateFollowPosition(bool snap = false)
	{
		Vector3 targetOffset = m_targetOffset;
		if (m_target != null)
		{
			targetOffset += m_target.position;
		}
		m_followPosition = new Vector3(CalcFollowPos(m_followPosition.x, targetOffset.x, m_deadZone.x, m_boundsMin.x, m_boundsMax.x), CalcFollowPos(m_followPosition.y, targetOffset.y, m_deadZone.y, m_boundsMin.y, m_boundsMax.y), CalcFollowPos(m_followPosition.z, targetOffset.z, m_deadZone.z, m_boundsMin.z, m_boundsMax.z));
		Vector3 vector = m_followPosition + base.transform.rotation * Vector3.back * m_distance;
		if (snap)
		{
			m_position = vector;
		}
		else
		{
			m_position = Vector3.Lerp(m_position, vector, m_lerpSpeed * Time.deltaTime);
		}
		base.transform.position = m_position + m_shake.GetOffset();
	}

	private float CalcFollowPos(float previous, float target, float deadzone, float boundsMin, float boundsMax)
	{
		float a = previous;
		a = Mathf.Max(a, target - deadzone);
		a = Mathf.Min(a, target + deadzone);
		return Mathf.Clamp(a, boundsMin, boundsMax);
	}
}
