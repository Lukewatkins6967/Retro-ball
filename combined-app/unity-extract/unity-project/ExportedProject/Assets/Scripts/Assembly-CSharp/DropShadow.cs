using UnityEngine;

public class DropShadow : MonoBehaviour
{
	[SerializeField]
	private LayerMask m_groundCollideMask;

	[SerializeField]
	private GameObject m_dropShadowPrefab;

	[SerializeField]
	private MinMaxRange m_distanceRange = new MinMaxRange(0f, 5f);

	[SerializeField]
	private MinMaxRange m_scaleRange = new MinMaxRange(0.3f, 1f);

	private Transform m_dropShadow;

	private void Awake()
	{
		m_dropShadow = Object.Instantiate(m_dropShadowPrefab).transform;
	}

	private void OnDestroy()
	{
		if ((bool)m_dropShadow)
		{
			Object.Destroy(m_dropShadow.gameObject);
		}
	}

	private void Update()
	{
		Ray ray = new Ray(base.transform.position + Vector3.up, Vector3.down);
		RaycastHit hitInfo;
		if (Physics.Raycast(ray, out hitInfo, m_distanceRange.Max, m_groundCollideMask.value))
		{
			float t = m_distanceRange.InverseLerp(hitInfo.distance);
			float num = 1f - m_scaleRange.Lerp(t);
			m_dropShadow.transform.localScale = new Vector3(num, 1f, num);
			m_dropShadow.transform.position = hitInfo.point + ray.direction * -0.01f;
		}
		else
		{
			m_dropShadow.transform.localScale = Vector3.zero;
		}
	}
}
