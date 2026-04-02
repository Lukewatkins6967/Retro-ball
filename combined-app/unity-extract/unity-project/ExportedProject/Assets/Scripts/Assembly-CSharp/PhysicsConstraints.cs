using UnityEngine;

public class PhysicsConstraints : MonoBehaviour
{
	[BitMask(typeof(RigidbodyConstraints))]
	[SerializeField]
	private RigidbodyConstraints m_constraints = (RigidbodyConstraints)48;

	private Vector3 m_initialEuler = Vector3.zero;

	private Rigidbody m_body;

	private void Start()
	{
		m_initialEuler = base.transform.eulerAngles;
		m_body = GetComponent<Rigidbody>();
	}

	private void LateUpdate()
	{
		Vector3 eulerAngles = m_body.rotation.eulerAngles;
		if ((m_constraints & RigidbodyConstraints.FreezeRotationX) != RigidbodyConstraints.None)
		{
			eulerAngles.x = m_initialEuler.x;
		}
		if ((m_constraints & RigidbodyConstraints.FreezeRotationY) != RigidbodyConstraints.None)
		{
			eulerAngles.y = m_initialEuler.y;
		}
		if ((m_constraints & RigidbodyConstraints.FreezeRotationZ) != RigidbodyConstraints.None)
		{
			eulerAngles.z = m_initialEuler.z;
		}
		base.transform.eulerAngles = eulerAngles;
		m_body.rotation = base.transform.rotation;
		m_body.constraints = RigidbodyConstraints.None;
		m_body.constraints = m_constraints;
	}
}
